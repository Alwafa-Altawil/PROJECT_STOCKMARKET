"""
Simulator service for stock market simulation.
Handles price generation and market state management.
"""
import math
import random
from decimal import Decimal, ROUND_HALF_UP
from django.utils import timezone
from .models import Stock, StockPrice
from .services import AlphaVantageClient


def _to_money(value):
    """Convert value to money with proper decimal places."""
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class MarketSimulator:
    """Manages stock market simulation logic."""
    
    # Store price history in memory for efficient retrieval
    _price_history = {}
    MAX_HISTORY = 40
    
    @classmethod
    def initialize_history(cls, source=None):
        """Initialize price history for all active stocks."""
        queryset = Stock.objects.filter(is_active=True)
        if source:
            queryset = queryset.filter(source=source)

        for stock in queryset:
            if stock.pk not in cls._price_history:
                cls._price_history[stock.pk] = [float(stock.price)] * cls.MAX_HISTORY
    
    @classmethod
    def get_price_history(cls, stock_id, limit=40):
        """Get price history for a stock."""
        cls.initialize_history()
        if stock_id not in cls._price_history:
            return []
        return cls._price_history[stock_id][-limit:]
    
    @classmethod
    def tick(cls, daily_volatility=0.015, daily_drift=0.0001, source=Stock.SOURCE_INTERNAL):
        """
        Simulate a market tick - updates all stock prices.
        
        Args:
            daily_volatility: Standard deviation of daily returns (default 1.5%)
            daily_drift: Expected daily return (default 0.01%)
        
        Returns:
            Dictionary with updated stock data
        """
        if daily_volatility <= 0 or daily_volatility > 0.2:
            raise ValueError("daily_volatility must be between 0 and 0.2")
        
        cls.initialize_history(source=source)
        updated = []
        
        for stock in Stock.objects.filter(is_active=True, source=source):
            # Geometric Brownian Motion for realistic price movement
            # dS = drift*S*dt + volatility*S*dW
            shock = random.gauss(0, 1)
            move = daily_drift + daily_volatility * shock
            
            current_price = float(stock.price)
            new_price = max(current_price * math.exp(move), 0.5)
            new_price_decimal = _to_money(new_price)
            
            # Update stock price
            stock.price = new_price_decimal
            stock.save(update_fields=["price", "updated_at"])
            
            # Record price history
            StockPrice.objects.create(stock=stock, close=new_price_decimal)
            
            # Update in-memory history
            if stock.pk not in cls._price_history:
                cls._price_history[stock.pk] = []
            
            cls._price_history[stock.pk].append(new_price)
            if len(cls._price_history[stock.pk]) > cls.MAX_HISTORY:
                cls._price_history[stock.pk].pop(0)
            
            updated.append({
                "id": stock.pk,
                "symbol": stock.symbol,
                "name": stock.name,
                "price": float(new_price_decimal),
                "history": cls._price_history[stock.pk],
            })
        
        return updated

    @classmethod
    def refresh_alpha_vantage_prices(cls):
        """Refresh prices for Alpha Vantage stocks."""
        client = AlphaVantageClient()
        cls.initialize_history(source=Stock.SOURCE_ALPHA_VANTAGE)
        updated = []

        for stock in Stock.objects.filter(is_active=True, source=Stock.SOURCE_ALPHA_VANTAGE):
            latest_close = client.get_latest_close(stock.symbol)
            if latest_close is None:
                continue

            new_price_decimal = _to_money(latest_close)
            stock.price = new_price_decimal
            stock.save(update_fields=["price", "updated_at"])
            StockPrice.objects.create(stock=stock, close=new_price_decimal)

            if stock.pk not in cls._price_history:
                cls._price_history[stock.pk] = []

            cls._price_history[stock.pk].append(float(new_price_decimal))
            if len(cls._price_history[stock.pk]) > cls.MAX_HISTORY:
                cls._price_history[stock.pk].pop(0)

            updated.append(
                {
                    "id": stock.pk,
                    "symbol": stock.symbol,
                    "name": stock.name,
                    "price": float(new_price_decimal),
                    "history": cls._price_history[stock.pk],
                }
            )

        return updated

    @classmethod
    def seed_stocks_from_alpha_vantage(cls, api_key=None):
        """Create or update default symbols from Alpha Vantage."""
        if not api_key:
            raise ValueError("Alpha Vantage API key is required")

        client = AlphaVantageClient()
        created = []
        updated = []
        failed = []

        for symbol in client.DEFAULT_SYMBOLS:
            latest_close = client.get_latest_close(symbol)
            if latest_close is None:
                failed.append(symbol)
                continue

            defaults = {
                "name": symbol,
                "price": _to_money(latest_close),
                "source": Stock.SOURCE_ALPHA_VANTAGE,
                "is_active": True,
            }
            stock, was_created = Stock.objects.update_or_create(
                symbol=symbol,
                defaults=defaults,
            )
            StockPrice.objects.create(stock=stock, close=stock.price)

            if was_created:
                created.append(symbol)
            else:
                updated.append(symbol)

        cls.reset_history()
        cls.initialize_history()
        return {
            "source": Stock.SOURCE_ALPHA_VANTAGE,
            "created": created,
            "updated": updated,
            "failed": failed,
            "rate_limited": len(failed) > 0 and len(created) == 0 and len(updated) == 0,
        }
    
    @classmethod
    def get_market_state(cls, source=Stock.SOURCE_INTERNAL):
        """Get current market state with all stocks and their prices."""
        cls.initialize_history(source=source)
        
        stocks_data = []
        for stock in Stock.objects.filter(is_active=True, source=source).order_by('symbol'):
            history = cls.get_price_history(stock.pk)
            stocks_data.append({
                "id": stock.pk,
                "symbol": stock.symbol,
                "name": stock.name,
                "price": float(stock.price),
                "source": stock.source,
                "history": history,
                "updated_at": stock.updated_at.isoformat(),
            })
        
        return {
            "timestamp": timezone.now().isoformat(),
            "source": source,
            "stocks": stocks_data,
        }
    
    @classmethod
    def reset_history(cls):
        """Reset price history (useful for testing)."""
        cls._price_history = {}
