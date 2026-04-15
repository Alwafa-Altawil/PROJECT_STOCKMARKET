import requests
import os
from dotenv import load_dotenv
from django.core.cache import cache
import logging

load_dotenv()
logger = logging.getLogger(__name__)

class AlphaVantageClient:
    def __init__(self):
        self.api_key = os.getenv("ALPHA_VANTAGE_API_KEY")
        self.base_url = "https://www.alphavantage.co/query"
    
    def get_daily_data(self, symbol):
        """Récupère les données quotidiennes"""
        cache_key = f"av_daily_{symbol}"
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        try:
            params = {
                'function': 'TIME_SERIES_DAILY',
                'symbol': symbol,
                'apikey': self.api_key
            }
            response = requests.get(self.base_url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            cache.set(cache_key, data, 3600)  # Cache 1 heure
            return data
        except Exception as e:
            logger.error(f"Erreur API: {e}")
            return None