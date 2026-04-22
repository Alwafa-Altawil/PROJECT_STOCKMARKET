"""
Simulator service for stock market simulation.
Handles price generation and market state management.
"""
import math
import random
from decimal import Decimal, ROUND_HALF_UP
from django.utils import timezone
from .models import Stock, StockPrice
import requests
import logging

logger = logging.getLogger(__name__)


def _to_money(value):
    """Convert value to money with proper decimal places."""
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class MarketSimulator:
    """Manages stock market simulation logic."""
    
    # Store price history in memory for efficient retrieval
    _price_history = {}
    _data_source = "simulated"
    MAX_HISTORY = 40

    @classmethod
    def get_data_source(cls):
        return cls._data_source

    @classmethod
    def set_data_source(cls, source):
        if source not in {"simulated", "alpha_vantage"}:
            raise ValueError("source must be 'simulated' or 'alpha_vantage'")
        cls._data_source = source
    
    @classmethod
    def initialize_history(cls):
        """Initialize price history for all active stocks."""
        for stock in Stock.objects.filter(is_active=True):
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
    def tick(cls, daily_volatility=0.015, daily_drift=0.0001):
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
        
        cls.initialize_history()
        updated = []
        
        for stock in Stock.objects.filter(is_active=True):
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
    def get_market_state(cls):
        """Get current market state with all stocks and their prices."""
        cls.initialize_history()
        
        stocks_data = []
        for stock in Stock.objects.filter(is_active=True).order_by('symbol'):
            history = cls.get_price_history(stock.pk)
            stocks_data.append({
                "id": stock.pk,
                "symbol": stock.symbol,
                "name": stock.name,
                "price": float(stock.price),
                "history": history,
                "updated_at": stock.updated_at.isoformat(),
            })
        
        return {
            "timestamp": timezone.now().isoformat(),
            "source": cls.get_data_source(),
            "stocks": stocks_data,
        }
    
    @classmethod
    def reset_history(cls):
        """Reset price history (useful for testing)."""
        cls._price_history = {}
    
    @classmethod
    def seed_stocks_from_alpha_vantage(cls, api_key):
        """
        Seed stocks from Alpha Vantage API.
        
        Args:
            api_key: Alpha Vantage API key
        
        Returns:
            List of created stock symbols
        """
        base_url = "https://www.alphavantage.co/query"
        watchlist = [
            ("AAPL", "Apple Inc.", Decimal("180.00")),
            ("MSFT", "Microsoft Corp.", Decimal("420.00")),
            ("GOOGL", "Alphabet Inc.", Decimal("170.00")),
            ("TSLA", "Tesla Inc.", Decimal("230.00")),
            ("AMZN", "Amazon.com Inc.", Decimal("185.00")),
        ]

        created = []
        updated = []
        fallback = []
        warnings = []
        rate_limited = False
        rate_limit_message = None

        for symbol, default_name, default_price in watchlist:
            latest_price = None

            if api_key and not rate_limited:
                try:
                    params = {
                        "function": "GLOBAL_QUOTE",
                        "symbol": symbol,
                        "apikey": api_key,
                    }
                    response = requests.get(base_url, params=params, timeout=10)
                    response.raise_for_status()
                    data = response.json()

                    if data.get("Note") or data.get("Information"):
                        rate_limited = True
                        rate_limit_message = data.get("Note") or data.get("Information")
                        warnings.append(f"Alpha Vantage limit reached: {rate_limit_message}")
                    elif data.get("Error Message"):
                        warnings.append(f"Alpha Vantage error for {symbol}: {data['Error Message']}")
                    else:
                        quote = data.get("Global Quote") or {}
                        price_str = quote.get("05. price")
                        if price_str:
                            latest_price = _to_money(price_str)
                        else:
                            warnings.append(f"No quote price returned for {symbol}")
                except Exception as e:
                    warnings.append(f"Failed to fetch {symbol} from Alpha Vantage: {str(e)}")

            stock = Stock.objects.filter(symbol=symbol).first()
            if latest_price is None:
                if stock:
                    latest_price = stock.price
                    fallback.append(symbol)
                else:
                    latest_price = default_price
                    fallback.append(symbol)

            if stock is None:
                stock = Stock.objects.create(
                    symbol=symbol,
                    name=default_name,
                    price=latest_price,
                    is_active=True,
                )
                created.append(symbol)
            else:
                stock.name = stock.name or default_name
                stock.price = latest_price
                stock.is_active = True
                stock.save(update_fields=["name", "price", "is_active", "updated_at"])
                updated.append(symbol)

            StockPrice.objects.create(stock=stock, close=latest_price)

        cls.initialize_history()
        for stock in Stock.objects.filter(symbol__in=[row[0] for row in watchlist]):
            history = cls._price_history.setdefault(stock.pk, [float(stock.price)] * cls.MAX_HISTORY)
            history.append(float(stock.price))
            if len(history) > cls.MAX_HISTORY:
                cls._price_history[stock.pk] = history[-cls.MAX_HISTORY:]

        return {
            "created": created,
            "updated": updated,
            "fallback": fallback,
            "warnings": warnings,
            "rate_limited": rate_limited,
            "rate_limit_message": rate_limit_message,
        }
