import math
import random
from decimal import Decimal, ROUND_HALF_UP
 
from django.db import transaction as db_transaction
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
 
from .models import Forecast, News, Portfolio, PortfolioHolding, Profile, Stock, StockPrice, Transaction
from .serializers import (
    ForecastSerializer,
    NewsSerializer,
    PortfolioHoldingSerializer,
    PortfolioSerializer,
    RegisterSerializer,
    StockSerializer,
    TransactionSerializer,
)
from .simulator import MarketSimulator
from .news_generator import (
    generate_all_news,
    create_news_and_update_price,
    apply_due_news_impacts,
)

import numpy as np
 
 
def _to_money(value):
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
 
 
def _log_returns_from_prices(prices):
    """Calculate log returns using NumPy vectorization."""
    prices_array = np.array([float(p) for p in prices])
    # Filter out zero or negative prices
    valid_mask = prices_array > 0
    if not np.all(valid_mask):
        prices_array = prices_array[valid_mask]
    
    if len(prices_array) < 2:
        return []
    
    # Vectorized log returns calculation
    returns = np.log(prices_array[1:] / prices_array[:-1])
    return returns.tolist()
 
 
def _monte_carlo_paths(start_price, drift, volatility, horizon_days, paths):
    """Generate Monte Carlo final prices using NumPy vectorization."""
    dt = 1 / 252
    drift_term = (drift - 0.5 * volatility * volatility) * dt
    sigma_term = volatility * np.sqrt(dt)
    
    # Generate all shocks at once: (paths, horizon_days)
    shocks = np.random.standard_normal((paths, horizon_days))
    
    # Calculate cumulative price movements
    # exponent shape: (paths, horizon_days)
    exponents = drift_term + sigma_term * shocks
    movements = np.exp(exponents)
    
    # Cumulative product along time axis gives price paths
    # Start with initial price and multiply by movements
    price_multipliers = np.cumprod(movements, axis=1)
    final_prices = float(start_price) * price_multipliers[:, -1]
    
    return final_prices.tolist()


def _monte_carlo_paths_full(start_price, drift, volatility, horizon_days, paths):
    """Generate full Monte Carlo paths with all intermediate prices using NumPy."""
    dt = 1 / 252
    drift_term = (drift - 0.5 * volatility * volatility) * dt
    sigma_term = volatility * np.sqrt(dt)
    
    # Generate all shocks: (paths, horizon_days)
    shocks = np.random.standard_normal((paths, horizon_days))
    
    # Calculate movements
    exponents = drift_term + sigma_term * shocks
    movements = np.exp(exponents)
    
    # Calculate cumulative product to get price ratios
    price_multipliers = np.cumprod(movements, axis=1)
    
    # Add initial price column (all prices start at start_price)
    initial_prices = np.full((paths, 1), float(start_price))
    price_paths = np.hstack([initial_prices, float(start_price) * price_multipliers])
    
    # Convert to list of paths
    return price_paths.tolist()
 
 
class StockViewSet(viewsets.ModelViewSet):
    queryset = Stock.objects.all()
    serializer_class = StockSerializer
    permission_classes = [AllowAny]
 
 
class PortfolioViewSet(viewsets.ModelViewSet):
    serializer_class = PortfolioSerializer
    permission_classes = [IsAuthenticated]
 
    def get_queryset(self): # type: ignore
        return Portfolio.objects.filter(user=self.request.user).prefetch_related("holdings__stock")
 
 
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_portfolio(request):
    user = request.user
    portfolio, _ = Portfolio.objects.get_or_create(user=user)
    holdings = PortfolioHolding.objects.filter(
        portfolio=portfolio, quantity__gt=0
    ).select_related("stock")
    position = PortfolioHoldingSerializer(holdings, many=True).data
 
    profile, _ = Profile.objects.get_or_create(user=user)
    market_value = sum((h.quantity * h.stock.price for h in holdings), Decimal("0"))
    equity = profile.balance + market_value
 
    return Response(
        {
            "balance": profile.balance,
            "market_value": market_value.quantize(Decimal("0.01")),
            "equity": equity.quantize(Decimal("0.01")),
            "positions": position,
        }
    )
 
 
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_transactions(request):
    user = request.user
    rows = Transaction.objects.filter(user=user).select_related("stock")[:100]
    return Response(TransactionSerializer(rows, many=True).data)
 
 
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def buy_stock(request):
    user = request.user
    stock_id = request.data.get("stock_id")
    quantity = int(request.data.get("quantity", 0))
 
    if quantity <= 0:
        return Response({"error": "quantity must be > 0"}, status=status.HTTP_400_BAD_REQUEST)
 
    try:
        stock = Stock.objects.get(pk=stock_id, is_active=True)
    except Stock.DoesNotExist:
        return Response({"error": "stock not found"}, status=status.HTTP_404_NOT_FOUND)
 
    with db_transaction.atomic():
        profile, _ = Profile.objects.select_for_update().get_or_create(user=user)
        portfolio, _ = Portfolio.objects.select_for_update().get_or_create(
            user=user
        )
        holding, _ = PortfolioHolding.objects.select_for_update().get_or_create(
            portfolio=portfolio, stock=stock
        )
        cost = _to_money(stock.price * quantity)
        if profile.balance < cost:
            return Response({"error": "not enough balance"}, status=status.HTTP_400_BAD_REQUEST)
 
        previous_qty = holding.quantity
        new_qty = previous_qty + quantity
        weighted_cost = (holding.average_buy_price * previous_qty) + (stock.price * quantity)
 
        profile.balance = _to_money(profile.balance - cost)
        holding.quantity = new_qty
        holding.average_buy_price = _to_money(weighted_cost / new_qty)
        profile.save()
        portfolio.save(update_fields=["updated_at"])
        holding.save()
 
        transaction = Transaction.objects.create(
            user=user,
            stock=stock,
            quantity=quantity,
            price=stock.price,
            type=Transaction.BUY,
            notional=cost,
        )
 
    # Calculate market value
    all_holdings = PortfolioHolding.objects.filter(
        portfolio=portfolio, quantity__gt=0
    ).select_related("stock")
    market_value = sum((h.quantity * h.stock.price for h in all_holdings), Decimal("0"))
    equity = profile.balance + market_value
    
    return Response({
        "success": True,
        "transaction": {
            "id": transaction.pk,
            "stock_id": stock.pk,
            "symbol": stock.symbol,
            "quantity": quantity,
            "price": float(stock.price),
            "total": float(cost),
            "timestamp": transaction.timestamp.isoformat(),
        },
        "portfolio": {
            "balance": float(profile.balance),
            "market_value": float(market_value),
            "equity": float(equity),
        },
    })
 
 
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def sell_stock(request):
    user = request.user
    stock_id = request.data.get("stock_id")
    quantity = int(request.data.get("quantity", 0))
 
    if quantity <= 0:
        return Response({"error": "quantity must be > 0"}, status=status.HTTP_400_BAD_REQUEST)
 
    try:
        stock = Stock.objects.get(pk=stock_id, is_active=True)
    except Stock.DoesNotExist:
        return Response({"error": "stock not found"}, status=status.HTTP_404_NOT_FOUND)
 
    with db_transaction.atomic():
        profile, _ = Profile.objects.select_for_update().get_or_create(user=user)
        portfolio, _ = Portfolio.objects.select_for_update().get_or_create(user=user)
        try:
            holding = PortfolioHolding.objects.select_for_update().get(
                portfolio=portfolio, stock=stock
            )
        except PortfolioHolding.DoesNotExist:
            return Response({"error": "no position for this stock"}, status=status.HTTP_400_BAD_REQUEST)
 
        if holding.quantity < quantity:
            return Response({"error": "not enough shares"}, status=status.HTTP_400_BAD_REQUEST)
 
        proceeds = _to_money(stock.price * quantity)
        holding.quantity -= quantity
        if holding.quantity == 0:
            holding.delete()
            holding = None
 
        profile.balance = _to_money(profile.balance + proceeds)
        profile.save()
        portfolio.save(update_fields=["updated_at"])
        if holding is not None:
            holding.save()
 
        transaction = Transaction.objects.create(
            user=user,
            stock=stock,
            quantity=quantity,
            price=stock.price,
            type=Transaction.SELL,
            notional=proceeds,
        )
 
    # Calculate market value
    all_holdings = PortfolioHolding.objects.filter(
        portfolio=portfolio, quantity__gt=0
    ).select_related("stock")
    market_value = sum((h.quantity * h.stock.price for h in all_holdings), Decimal("0"))
    equity = profile.balance + market_value
    
    return Response({
        "success": True,
        "transaction": {
            "id": transaction.pk,
            "stock_id": stock.pk,
            "symbol": stock.symbol,
            "quantity": quantity,
            "price": float(stock.price),
            "total": float(proceeds),
            "timestamp": transaction.timestamp.isoformat(),
        },
        "portfolio": {
            "balance": float(profile.balance),
            "market_value": float(market_value),
            "equity": float(equity),
        },
    })
 
 
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_monte_carlo_forecast(request):
    user = request.user
    stock_id = request.data.get("stock_id")
    horizon_days = int(request.data.get("horizon_days", 30))
    paths = int(request.data.get("paths", 5000))
 
    if horizon_days < 1 or horizon_days > 365:
        return Response(
            {"error": "horizon_days must be between 1 and 365"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if paths < 500 or paths > 50000:
        return Response(
            {"error": "paths must be between 500 and 50000"},
            status=status.HTTP_400_BAD_REQUEST,
        )
 
    try:
        stock = Stock.objects.get(pk=stock_id, is_active=True)
    except Stock.DoesNotExist:
        return Response({"error": "stock not found"}, status=status.HTTP_404_NOT_FOUND)
 
    historical = list(
        StockPrice.objects.filter(stock=stock)
        .order_by("recorded_at")
        .values_list("close", flat=True)
    )
    if len(historical) < 21:
        return Response(
            {"error": "at least 21 historical prices are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )
 
    returns = _log_returns_from_prices(historical)
    if len(returns) < 20:
        return Response({"error": "insufficient return series"}, status=status.HTTP_400_BAD_REQUEST)
 
    drift = sum(returns) / len(returns)
    variance = sum((r - drift) ** 2 for r in returns) / max(len(returns) - 1, 1)
    volatility = math.sqrt(max(variance, 0))
 
    simulated = sorted(_monte_carlo_paths(stock.price, drift, volatility, horizon_days, paths))
    p05 = simulated[int(paths * 0.05)]
    p50 = simulated[int(paths * 0.50)]
    p95 = simulated[int(paths * 0.95)]
    probability_up = sum(1 for val in simulated if val >= float(stock.price)) / len(simulated)
 
    forecast = Forecast.objects.create(
        user=user,
        stock=stock,
        horizon_days=horizon_days,
        paths=paths,
        drift=drift,
        volatility=volatility,
        percentile_5=_to_money(p05),
        median=_to_money(p50),
        percentile_95=_to_money(p95),
        probability_up=probability_up,
    )
 
    return Response(ForecastSerializer(forecast).data, status=status.HTTP_201_CREATED)
 
 
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_forecasts(request):
    user = request.user
    rows = Forecast.objects.filter(user=user).select_related("stock")[:50]
    return Response(ForecastSerializer(rows, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_forecast_paths(request, forecast_id):
    """Get Monte Carlo simulation paths for a forecast with aggressive compression."""
    try:
        forecast = Forecast.objects.get(id=forecast_id, user=request.user)
    except Forecast.DoesNotExist:
        return Response({"error": "forecast not found"}, status=status.HTTP_404_NOT_FOUND)

    # Only generate 100 sample paths for display (aggressive downsampling)
    sample_paths = _monte_carlo_paths_full(
        forecast.stock.price,
        forecast.drift,
        forecast.volatility,
        forecast.horizon_days,
        100  # Reduced from 150 to 100 for faster rendering
    )
    
    # Compress paths: downsample each path to max 50 points
    max_points = 50
    compressed_paths = []
    for path in sample_paths:
        if len(path) > max_points:
            # Keep first, last, and evenly spaced points
            step = len(path) // max_points
            compressed = [path[0]] + [path[i] for i in range(step, len(path), step)] + [path[-1]]
        else:
            compressed = path
        compressed_paths.append(compressed)

    # Also generate final prices for accurate percentile calculation
    final_prices_sample = sorted([path[-1] for path in sample_paths])
    p05 = final_prices_sample[int(len(final_prices_sample) * 0.05)]
    p50 = final_prices_sample[int(len(final_prices_sample) * 0.50)]
    p95 = final_prices_sample[int(len(final_prices_sample) * 0.95)]

    return Response({
        "forecast": ForecastSerializer(forecast).data,
        "paths": compressed_paths,
        "percentile_5": float(p05),
        "median": float(p50),
        "percentile_95": float(p95),
    })
 
@api_view(["POST"])
@permission_classes([AllowAny])
def record_price(request):
    stock_id = request.data.get("stock_id")
    price = request.data.get("price")
    if stock_id is None or price is None:
        return Response(
            {"error": "stock_id and price are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )
 
    try:
        stock = Stock.objects.get(id=stock_id, is_active=True)
    except Stock.DoesNotExist:
        return Response({"error": "stock not found"}, status=status.HTTP_404_NOT_FOUND)
 
    value = _to_money(price)
    stock.price = value
    stock.save(update_fields=["price", "updated_at"])
    StockPrice.objects.create(stock=stock, close=value)
    return Response({"success": True, "price": value})
 
 
@api_view(["POST"])
@permission_classes([AllowAny])
def market_tick(request):
    daily_volatility = float(request.data.get("daily_volatility", 0.015))
    daily_drift = float(request.data.get("daily_drift", 0.0001))
    
    try:
        MarketSimulator.tick(
            daily_volatility=daily_volatility,
            daily_drift=daily_drift
        )
        applied_news = apply_due_news_impacts()
        market_data = MarketSimulator.get_market_state()
        return Response(
            {
                "updated": market_data["stocks"],
                "count": len(market_data["stocks"]),
                "applied_news_count": len(applied_news),
            }
        )
    except ValueError as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def market_state(request):
    """Get current market state with all active stocks, prices, and price history."""
    market_data = MarketSimulator.get_market_state()
    return Response(market_data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def portfolio_status(request):
    """Get current user portfolio status with balance, holdings, and market value."""
    user = request.user
    portfolio, _ = Portfolio.objects.get_or_create(user=user)
    profile, _ = Profile.objects.get_or_create(user=user)
    
    holdings = PortfolioHolding.objects.filter(
        portfolio=portfolio, quantity__gt=0
    ).select_related("stock")
    
    holdings_data = []
    market_value = Decimal("0")
    
    for holding in holdings:
        position_value = holding.quantity * holding.stock.price
        market_value += position_value
        
        holdings_data.append({
            "stock_id": holding.stock.pk,
            "symbol": holding.stock.symbol,
            "name": holding.stock.name,
            "quantity": holding.quantity,
            "current_price": float(holding.stock.price),
            "average_buy_price": float(holding.average_buy_price),
            "position_value": float(position_value),
            "unrealized_gain": float(position_value - (holding.average_buy_price * holding.quantity)),
        })
    
    equity = profile.balance + market_value
    
    return Response({
        "balance": float(profile.balance),
        "market_value": float(market_value),
        "equity": float(equity),
        "starting_balance": float(profile.starting_balance),
        "total_gain": float(equity - profile.starting_balance),
        "total_return_pct": float((equity - profile.starting_balance) / profile.starting_balance * 100) if profile.starting_balance > 0 else 0,
        "holdings": holdings_data,
        "updated_at": portfolio.updated_at.isoformat(),
    })


@api_view(["POST"])
@permission_classes([AllowAny])
def seed_stocks(request):
    """Initialize default stocks in the database."""
    defaults = [
        # Technologie
        {"symbol": "AAPL", "name": "Apple Inc.", "price": Decimal("180.00")},
        {"symbol": "MSFT", "name": "Microsoft Corp.", "price": Decimal("420.00")},
        {"symbol": "GOOGL", "name": "Alphabet Inc.", "price": Decimal("170.00")},
        {"symbol": "TSLA", "name": "Tesla Inc.", "price": Decimal("230.00")},
        {"symbol": "AMZN", "name": "Amazon.com Inc.", "price": Decimal("185.00")},
        {"symbol": "META", "name": "Meta Platforms Inc.", "price": Decimal("325.00")},
        {"symbol": "NVDA", "name": "NVIDIA Corporation", "price": Decimal("880.00")},
        {"symbol": "AVGO", "name": "Broadcom Inc.", "price": Decimal("850.00")},
        {"symbol": "AMD", "name": "Advanced Micro Devices Inc.", "price": Decimal("185.00")},
        {"symbol": "INTC", "name": "Intel Corporation", "price": Decimal("35.00")},
        # E-Commerce & Détail
        {"symbol": "WMT", "name": "Walmart Inc.", "price": Decimal("92.00")},
        {"symbol": "COST", "name": "Costco Wholesale Corporation", "price": Decimal("905.00")},
        # Secteur Financier
        {"symbol": "JPM", "name": "JPMorgan Chase & Co.", "price": Decimal("195.00")},
        {"symbol": "BAC", "name": "Bank of America Corp.", "price": Decimal("35.00")},
        {"symbol": "WFC", "name": "Wells Fargo & Company", "price": Decimal("63.00")},
        {"symbol": "GS", "name": "Goldman Sachs Group Inc.", "price": Decimal("415.00")},
        # Santé & Pharma
        {"symbol": "JNJ", "name": "Johnson & Johnson", "price": Decimal("158.00")},
        {"symbol": "UNH", "name": "UnitedHealth Group Inc.", "price": Decimal("532.00")},
        {"symbol": "PFE", "name": "Pfizer Inc.", "price": Decimal("28.00")},
        # Énergie
        {"symbol": "XOM", "name": "Exxon Mobil Corporation", "price": Decimal("112.00")},
        {"symbol": "CVX", "name": "Chevron Corporation", "price": Decimal("160.00")},
        # Industrie & Infrastructure
        {"symbol": "BA", "name": "The Boeing Company", "price": Decimal("182.00")},
        {"symbol": "GE", "name": "General Electric Company", "price": Decimal("128.00")},
        # Biens de Consommation
        {"symbol": "KO", "name": "The Coca-Cola Company", "price": Decimal("62.00")},
        {"symbol": "PEP", "name": "PepsiCo Inc.", "price": Decimal("188.00")},
        {"symbol": "MCD", "name": "McDonald's Corporation", "price": Decimal("298.00")},
        {"symbol": "NKE", "name": "Nike Inc.", "price": Decimal("75.00")},
        {"symbol": "SBUX", "name": "Starbucks Corporation", "price": Decimal("98.00")},
    ]
 
    created = []
    for row in defaults:
        stock, was_created = Stock.objects.get_or_create(
            symbol=row["symbol"],
            defaults={"name": row["name"], "price": row["price"], "is_active": True},
        )
        if was_created:
            created.append(stock.symbol)
        StockPrice.objects.get_or_create(stock=stock, close=stock.price)
 
    return Response({"created": created, "count": len(created)})

@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response(
            {"id": user.id, "username": user.username, "email": user.email}, #type: ignore
            status=status.HTTP_201_CREATED,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


login = TokenObtainPairView.as_view(permission_classes=[AllowAny])
refresh = TokenRefreshView.as_view(permission_classes=[AllowAny])

@api_view(["GET"])
@permission_classes([AllowAny])
def get_latest_news(request):
    """Get latest news, optionally filtered by stock_id."""
    stock_id = request.query_params.get("stock_id")
    limit = int(request.query_params.get("limit", 50))
    
    if stock_id:
        try:
            stock = Stock.objects.get(pk=stock_id, is_active=True)
            news_list = News.objects.filter(stock=stock)[:limit]
        except Stock.DoesNotExist:
            return Response({"error": "stock not found"}, status=status.HTTP_404_NOT_FOUND)
    else:
        news_list = News.objects.all()[:limit]
    
    return Response(NewsSerializer(news_list, many=True).data)


@api_view(["POST"])
@permission_classes([AllowAny])
def generate_news_endpoint(request):
    """Generate news for all active stocks and update their prices."""
    try:
        news_created = generate_all_news()
        return Response({
            "success": True,
            "count": len(news_created),
            "news": NewsSerializer(news_created, many=True).data,
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def generate_news_for_stock(request):
    """Generate news for a specific stock."""
    stock_id = request.data.get("stock_id")
    
    if not stock_id:
        return Response(
            {"error": "stock_id is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    try:
        stock = Stock.objects.get(pk=stock_id, is_active=True)
    except Stock.DoesNotExist:
        return Response({"error": "stock not found"}, status=status.HTTP_404_NOT_FOUND)
    
    try:
        news = create_news_and_update_price(stock)
        return Response(NewsSerializer(news).data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    refresh_token = request.data.get("refresh")
    if not refresh_token:
        return Response({"error": "refresh token is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        token = RefreshToken(refresh_token)
        token.blacklist()
    except Exception:
        return Response({"error": "invalid refresh token"}, status=status.HTTP_400_BAD_REQUEST)

    return Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def trigger_big_news(request):
    """Trigger creation of a single big-impact news for a random active stock."""
    try:
        from .news_generator import create_big_impact_news_for_random_stock

        news = create_big_impact_news_for_random_stock()
        return Response(NewsSerializer(news).data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
