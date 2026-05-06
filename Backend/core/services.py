import requests
import os
from dotenv import load_dotenv
from django.core.cache import cache
from django.conf import settings
import logging

# Load environment variables
load_dotenv()
logger = logging.getLogger(__name__)

class AlphaVantageClient:
    DEFAULT_SYMBOLS = ["AAPL", "MSFT", "GOOGL", "TSLA", "AMZN"]

    def __init__(self):
        # Fetch the key securely from the .env file
        self.api_key = (
            settings.ALPHA_VANTAGE_API_KEY
            or os.getenv("ALPHA_VANTAGE_API_KEY")
            or os.getenv("ALPHA_VANTAGE_KEY")
        )
        self.base_url = "https://www.alphavantage.co/query"
        
        # Crash loudly with a helpful message if the key is missing
        if not self.api_key:
            error_msg = "API Key not configured! Please ensure ALPHA_VANTAGE_KEY is set in your .env file."
            logger.error(error_msg)
            raise ValueError(error_msg)

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
            
            # 3. Check if Alpha Vantage returned an API error inside the JSON
            if "Error Message" in data:
                logger.error(f"Alpha Vantage API Error: {data['Error Message']}")
                return None
                
            cache.set(cache_key, data, 3600)  # Cache 1 heure
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Network/Request Error: {e}")
            return None

    def get_latest_close(self, symbol):
        """Return latest close price for symbol as float."""
        payload = self.get_daily_data(symbol)
        if not payload:
            return None

        series = payload.get("Time Series (Daily)")
        if not isinstance(series, dict) or not series:
            logger.error("Missing Time Series (Daily) for symbol %s", symbol)
            return None

        latest_day = max(series.keys())
        latest = series.get(latest_day, {})
        close_raw = latest.get("4. close")
        try:
            return float(close_raw)
        except (TypeError, ValueError):
            logger.error("Invalid close value for %s: %s", symbol, close_raw)
            return None