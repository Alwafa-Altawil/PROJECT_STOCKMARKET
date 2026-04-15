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

import os
 
from .models import Forecast, Portfolio, PortfolioHolding, Profile, Stock, StockPrice, Transaction
from .serializers import (
    ForecastSerializer,
    PortfolioHoldingSerializer,
    PortfolioSerializer,
    RegisterSerializer,
    StockSerializer,
    TransactionSerializer,
)
from .simulator import MarketSimulator
 
 
def _to_money(value):
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
 
 
def _log_returns_from_prices(prices):
    returns = []
    for i in range(1, len(prices)):
        previous_price = float(prices[i - 1])
        current_price = float(prices[i])
        if previous_price > 0 and current_price > 0:
            returns.append(math.log(current_price / previous_price))
    return returns
 
 
def _monte_carlo_paths(start_price, drift, volatility, horizon_days, paths):
    results = []
    dt = 1 / 252
    drift_term = (drift - 0.5 * volatility * volatility) * dt
    sigma_term = volatility * math.sqrt(dt)
 
    for _ in range(paths):
        price = float(start_price)
        for _ in range(horizon_days):
            shock = random.gauss(0, 1)
            price *= math.exp(drift_term + sigma_term * shock)
        results.append(price)
    return results
 
 
class StockViewSet(viewsets.ModelViewSet):
    queryset = Stock.objects.all()
    serializer_class = StockSerializer
 
 
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
        updated = MarketSimulator.tick(
            daily_volatility=daily_volatility,
            daily_drift=daily_drift
        )
        return Response({"updated": updated, "count": len(updated)})
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
        {"symbol": "AAPL", "name": "Apple Inc.", "price": Decimal("180.00")},
        {"symbol": "MSFT", "name": "Microsoft Corp.", "price": Decimal("420.00")},
        {"symbol": "GOOGL", "name": "Alphabet Inc.", "price": Decimal("170.00")},
        {"symbol": "TSLA", "name": "Tesla Inc.", "price": Decimal("230.00")},
        {"symbol": "AMZN", "name": "Amazon.com Inc.", "price": Decimal("185.00")},
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
def seed_stocks_from_alpha_vantage(request):
    """Seed stocks using Alpha Vantage API."""
    api_key = os.getenv("ALPHA_VANTAGE_API_KEY")
    if not api_key:
        return Response({"error": "API key not configured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    try:
        created = MarketSimulator.seed_stocks_from_alpha_vantage(api_key)
        return Response({"created": created, "count": len(created)}, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([AllowAny])
def reset_market(request):
    """Reset market to initial state by clearing all data."""
    Stock.objects.all().delete()
    StockPrice.objects.all().delete()
    Portfolio.objects.all().delete()
    PortfolioHolding.objects.all().delete()
    Transaction.objects.all().delete()
    Profile.objects.all().delete()
    Forecast.objects.all().delete()
    MarketSimulator.reset_history()
    return Response({"success": True, "message": "Market reset to initial state."})


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


login = TokenObtainPairView.as_view()
refresh = TokenRefreshView.as_view()

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
