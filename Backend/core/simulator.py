
import math
import numpy as np
from decimal import Decimal, ROUND_HALF_UP
from django.utils import timezone
from .models import Stock, StockPrice


def _to_money(value):
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class MarketSimulator:
   # Historique des prix stocké en mémoire
    _price_history = {}
    MAX_HISTORY = 40
     # Nombre maximum de prix conservés dans l’historique
    @classmethod
    def initialize_history(cls):
        for stock in Stock.objects.filter(is_active=True):
            if stock.pk not in cls._price_history:# Vérifie si l'action existe déjà dans l'historique
                cls._price_history[stock.pk] = [float(stock.price)] * cls.MAX_HISTORY  # Crée une liste de 40 valeurs identiques
    
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
        
        
        stocks = list(Stock.objects.filter(is_active=True))
        if not stocks:
            return updated
        
        current_prices = np.array([float(stock.price) for stock in stocks])
         # Génère des nombres aléatoires suivant une loi normale
        # Ces valeurs représentent les "chocs" du marché
        shocks = np.random.standard_normal(len(stocks))
        
        # nouveau_prix = ancien_prix * exp(drift + volatilité * choc)
        movements = daily_drift + daily_volatility * shocks
        new_prices = current_prices * np.exp(movements)
        
        
        new_prices = np.maximum(new_prices, 0.5)
        
        
        for i, stock in enumerate(stocks):
            new_price_decimal = _to_money(new_prices[i])
            
            
            stock.price = new_price_decimal
            stock.save(update_fields=["price", "updated_at"])
            
            
            StockPrice.objects.create(stock=stock, close=new_price_decimal)
            
            
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
