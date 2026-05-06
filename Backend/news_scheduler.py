#!/usr/bin/env python
"""
Script to continuously generate news every minute.
Run this in a separate terminal for continuous market news generation.

Usage:
    python news_scheduler.py
"""

import os
import sys
import django
import time
from datetime import datetime

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from core.news_generator import generate_all_news


def main():
    """Generate news every minute."""
    print("=" * 60)
    print("Market News Generator - Running every minute")
    print("=" * 60)
    print("Press Ctrl+C to stop\n")
    
    iteration = 0
    
    try:
        while True:
            iteration += 1
            current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"\n[{current_time}] Iteration #{iteration}")
            print("-" * 60)
            
            try:
                news_created = generate_all_news()
                print(f"✓ Created {len(news_created)} news items:")
                for news in news_created:
                    symbol = news.stock.symbol
                    impact = news.impact_percentage
                    sentiment = news.sentiment
                    price = news.stock.price
                    print(f"  • {symbol}: {news.headline[:50]}...")
                    print(f"    Sentiment: {sentiment}, Impact: {impact:+.2f}%, New Price: ${price}")
                
                print(f"\nWaiting 60 seconds until next generation...")
                time.sleep(60)
                
            except Exception as e:
                print(f"✗ Error generating news: {e}")
                print("Retrying in 60 seconds...")
                time.sleep(60)
                
    except KeyboardInterrupt:
        print("\n\n" + "=" * 60)
        print("Market News Generator stopped")
        print("=" * 60)
        sys.exit(0)


if __name__ == "__main__":
    main()
