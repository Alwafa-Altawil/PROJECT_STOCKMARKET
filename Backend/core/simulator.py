
import math
import numpy as np
from decimal import Decimal, ROUND_HALF_UP
from django.utils import timezone
from .models import Stock, StockPrice


def _to_money(value):
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class MarketSimulator:
   
    _price_history = {}
    MAX_HISTORY = 40
    
    @classmethod
    def initialize_history(cls):
        for stock in Stock.objects.filter(is_active=True):
            if stock.pk not in cls._price_history:
                cls._price_history[stock.pk] = [float(stock.price)] * cls.MAX_HISTORY
    
    @classmethod
    def get_price_history(cls, stock_id, limit=40):
    
        cls.initialize_history()
        if stock_id not in cls._price_history:
            return []
        return cls._price_history[stock_id][-limit:]
    
    @classmethod
    def tick(cls, daily_volatility=0.015, daily_drift=0.0001):
        """Update all stock prices using vectorized NumPy operations for efficiency."""
        
        if daily_volatility <= 0 or daily_volatility > 0.2:
            raise ValueError("daily_volatility must be between 0 and 0.2")
        
        cls.initialize_history()
        updated = []
        
        # Fetch all active stocks
        stocks = list(Stock.objects.filter(is_active=True))
        if not stocks:
            return updated
        
        # Get current prices as array
        current_prices = np.array([float(stock.price) for stock in stocks])
        
        # Generate shocks for all stocks at once (vectorized)
        shocks = np.random.standard_normal(len(stocks))
        
        # Calculate price movements using vectorized operations
        # dS = drift*S*dt + volatility*S*dW (Geometric Brownian Motion)
        movements = daily_drift + daily_volatility * shocks
        new_prices = current_prices * np.exp(movements)
        
        # Ensure prices stay above minimum
        new_prices = np.maximum(new_prices, 0.5)
        
        # Update each stock
        for i, stock in enumerate(stocks):
            new_price_decimal = _to_money(new_prices[i])
            
            # Update stock price
            stock.price = new_price_decimal
            stock.save(update_fields=["price", "updated_at"])
            
            # Record price history
            StockPrice.objects.create(stock=stock, close=new_price_decimal)
            
            # Update in-memory history
            if stock.pk not in cls._price_history:
                cls._price_history[stock.pk] = []
            
            cls._price_history[stock.pk].append(float(new_prices[i]))
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
        cls._price_history = {}
