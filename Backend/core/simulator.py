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
    MAX_HISTORY = 40
    
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
        try:
            base_url = "https://www.alphavantage.co/query"
            
            # List of popular stocks to fetch
            symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN']
            created = []
            
            for symbol in symbols:
                try:
                    params = {
                        'function': 'GLOBAL_QUOTE',
                        'symbol': symbol,
                        'apikey': api_key,
                    }
                    
                    response = requests.get(base_url, params=params, timeout=10)
                    response.raise_for_status()
                    data = response.json()
                    
                    if 'Global Quote' not in data or not data['Global Quote']:
                        logger.warning(f"No data returned for {symbol}")
                        continue
                    
                    quote = data['Global Quote']
                    price_str = quote.get('05. price', '0')
                    
                    if not price_str or price_str == '0':
                        logger.warning(f"Invalid price for {symbol}: {price_str}")
                        continue
                    
                    latest_price = float(price_str)
                    
                    # Create or update stock
                    stock, was_created = Stock.objects.get_or_create(
                        symbol=symbol,
                        defaults={
                            'name': quote.get('01. symbol', symbol),
                            'price': _to_money(latest_price),
                            'is_active': True,
                        }
                    )
                    
                    # Record initial price
                    StockPrice.objects.get_or_create(
                        stock=stock,
                        close=_to_money(latest_price)
                    )
                    
                    if was_created:
                        created.append(symbol)
                        logger.info(f"Created stock {symbol} with price {latest_price}")
                    
                except Exception as e:
                    logger.error(f"Error fetching {symbol}: {str(e)}")
                    continue
            
            return created
        
        except Exception as e:
            logger.error(f"Error in seed_stocks_from_alpha_vantage: {str(e)}")
            raise
