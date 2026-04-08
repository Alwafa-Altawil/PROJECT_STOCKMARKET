import math
import random
from decimal import Decimal, ROUND_HALF_UP
 
from django.db import transaction as db_transaction
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
 
from .models import Forecast, Portfolio, PortfolioHolding, Profile, Stock, StockPrice, Transaction
from .serializers import (
    ForecastSerializer,
    PortfolioHoldingSerializer,
    PortfolioSerializer,
    StockSerializer,
    TransactionSerializer,
)
 
 
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
    portfolio, _ = Portfolio.objects.get_or_create(user=request.user)
    holdings = PortfolioHolding.objects.filter(
        portfolio=portfolio, quantity__gt=0
    ).select_related("stock")
    positions = PortfolioHoldingSerializer(holdings, many=True).data
 
    profile, _ = Profile.objects.get_or_create(user=request.user)
    market_value = sum((h.quantity * h.stock.price for h in holdings), Decimal("0"))
    equity = profile.balance + market_value
 
    return Response(
        {
            "balance": profile.balance,
            "market_value": market_value.quantize(Decimal("0.01")),
            "equity": equity.quantize(Decimal("0.01")),
            "positions": positions,
        }
    )
 
 
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_transactions(request):
    rows = Transaction.objects.filter(user=request.user).select_related("stock")[:100]
    return Response(TransactionSerializer(rows, many=True).data)
 
 
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def buy_stock(request):
    stock_id = request.data.get("stock_id")
    quantity = int(request.data.get("quantity", 0))
 
    if quantity <= 0:
        return Response({"error": "quantity must be > 0"}, status=status.HTTP_400_BAD_REQUEST)
 
    try:
        stock = Stock.objects.get(id=stock_id, is_active=True)
    except Stock.DoesNotExist:
        return Response({"error": "stock not found"}, status=status.HTTP_404_NOT_FOUND)
 
    with db_transaction.atomic():
        profile, _ = Profile.objects.select_for_update().get_or_create(user=request.user)
        portfolio, _ = Portfolio.objects.select_for_update().get_or_create(
            user=request.user
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
 
        Transaction.objects.create(
            user=request.user,
            stock=stock,
            quantity=quantity,
            price=stock.price,
            type=Transaction.BUY,
            notional=cost,
        )
 
    return Response({"success": True, "balance": profile.balance})
 
 
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def sell_stock(request):
    stock_id = request.data.get("stock_id")
    quantity = int(request.data.get("quantity", 0))
 
    if quantity <= 0:
        return Response({"error": "quantity must be > 0"}, status=status.HTTP_400_BAD_REQUEST)
 
    try:
        stock = Stock.objects.get(id=stock_id, is_active=True)
    except Stock.DoesNotExist:
        return Response({"error": "stock not found"}, status=status.HTTP_404_NOT_FOUND)
 
    with db_transaction.atomic():
        profile, _ = Profile.objects.select_for_update().get_or_create(user=request.user)
        portfolio, _ = Portfolio.objects.select_for_update().get_or_create(user=request.user)
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
 
        Transaction.objects.create(
            user=request.user,
            stock=stock,
            quantity=quantity,
            price=stock.price,
            type=Transaction.SELL,
            notional=proceeds,
        )
 
    return Response({"success": True, "balance": profile.balance})
 
 
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_monte_carlo_forecast(request):
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
        stock = Stock.objects.get(id=stock_id, is_active=True)
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
        user=request.user,
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
    rows = Forecast.objects.filter(user=request.user).select_related("stock")[:50]
    return Response(ForecastSerializer(rows, many=True).data)
 
 
@api_view(["POST"])
@permission_classes([IsAuthenticated])
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
@permission_classes([IsAuthenticated])
def market_tick(request):
    daily_volatility = float(request.data.get("daily_volatility", 0.015))
    if daily_volatility <= 0 or daily_volatility > 0.2:
        return Response(
            {"error": "daily_volatility must be between 0 and 0.2"},
            status=status.HTTP_400_BAD_REQUEST,
        )
 
    updated = []
    for stock in Stock.objects.filter(is_active=True):
        move = random.gauss(0, daily_volatility)
        new_price = max(float(stock.price) * math.exp(move), 0.5)
        stock.price = _to_money(new_price)
        stock.save(update_fields=["price", "updated_at"])
        StockPrice.objects.create(stock=stock, close=stock.price)
        updated.append({"stock_id": stock.pk, "symbol": stock.symbol, "price": stock.price})
 
    return Response({"updated": updated})
 
 
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def seed_stocks(request):
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