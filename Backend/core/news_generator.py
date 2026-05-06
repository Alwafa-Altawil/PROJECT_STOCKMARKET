"""News generator service for stock market simulation."""

import random
from decimal import Decimal, ROUND_HALF_UP
from typing import Tuple

from .models import News, Stock, StockPrice

# Banque de nouvelles réalistes
NEWS_TEMPLATES = {
    "POSITIVE": [
        {
            "headline": "{company} Reports Record-Breaking Quarterly Earnings",
            "description": "{company} exceeded analyst expectations with strong Q{quarter} results, demonstrating robust market demand and operational efficiency.",
            "impact_range": (12.0, 28.0),
        },
        {
            "headline": "{company} Announces Major Product Launch",
            "description": "The company unveiled its latest innovation, expected to capture significant market share and drive future growth.",
            "impact_range": (10.0, 24.0),
        },
        {
            "headline": "{company} Receives Strategic Partnership",
            "description": "{company} has entered into a strategic partnership that strengthens its market position and expands revenue opportunities.",
            "impact_range": (11.0, 25.0),
        },
        {
            "headline": "{company} Stock Upgraded by Leading Analyst",
            "description": "A major investment bank upgraded {company}'s rating, citing strong fundamentals and growth prospects.",
            "impact_range": (8.0, 20.0),
        },
        {
            "headline": "{company} Achieves Sustainability Milestone",
            "description": "{company} announced significant progress on environmental goals, attracting ESG-focused investors.",
            "impact_range": (7.0, 18.0),
        },
        {
            "headline": "{company} Expands into New Market",
            "description": "The company is entering a high-growth market, positioning itself for long-term expansion and revenue diversification.",
            "impact_range": (10.0, 24.0),
        },
    ],
    "NEGATIVE": [
        {
            "headline": "{company} Misses Earnings Expectations",
            "description": "{company} reported Q{quarter} earnings below analyst consensus, citing supply chain challenges and reduced consumer spending.",
            "impact_range": (-18.0, -8.0),
        },
        {
            "headline": "{company} Issues Product Recall",
            "description": "The company announced a voluntary recall of certain products due to quality concerns, affecting customer confidence.",
            "impact_range": (-16.0, -7.0),
        },
        {
            "headline": "{company} Faces Regulatory Investigation",
            "description": "{company} is under investigation by regulatory authorities regarding compliance matters.",
            "impact_range": (-20.0, -10.0),
        },
        {
            "headline": "{company} Stock Downgraded by Major Analyst Firm",
            "description": "A leading investment bank downgraded {company}'s rating, citing weakening fundamentals and competitive pressures.",
            "impact_range": (-15.0, -6.0),
        },
        {
            "headline": "{company} CEO Steps Down",
            "description": "{company}'s CEO announced resignation, citing strategic differences. Leadership transition raises uncertainty.",
            "impact_range": (-14.0, -6.0),
        },
        {
            "headline": "{company} Reports Operating Loss",
            "description": "{company} posted an operating loss in the latest quarter, prompting cost-cutting measures and strategic review.",
            "impact_range": (-18.0, -8.0),
        },
        {
            "headline": "{company} Loses Major Customer",
            "description": "A significant customer announced discontinuation of business with {company}, impacting future revenue.",
            "impact_range": (-15.0, -7.0),
        },
    ],
    "NEUTRAL": [
        {
            "headline": "{company} Announces Dividend Payment",
            "description": "{company}'s board approved dividend payment, demonstrating confidence in cash generation capabilities.",
            "impact_range": (-3.0, 3.0),
        },
        {
            "headline": "{company} Holds Annual Shareholder Meeting",
            "description": "{company} held its annual meeting, with investors approving management proposals.",
            "impact_range": (-2.0, 2.0),
        },
        {
            "headline": "{company} Reports Market Research Update",
            "description": "Industry analysts publish research update on {company}, maintaining neutral stance on valuation.",
            "impact_range": (-3.0, 3.0),
        },
    ],
}


def generate_news_headline(company_name: str, sentiment: str) -> Tuple[str, str, float]:
    """Generate a random headline and description for a company."""
    templates = NEWS_TEMPLATES.get(sentiment, NEWS_TEMPLATES["NEUTRAL"])
    template = random.choice(templates)
    
    quarter = random.randint(1, 4)
    headline = template["headline"].format(company=company_name, quarter=quarter)
    description = template["description"].format(company=company_name, quarter=quarter)
    impact = random.uniform(*template["impact_range"])
    
    return headline, description, impact


def create_news_and_update_price(stock: Stock) -> News:
    """Create a news item. Price impact is applied after a tick delay."""
    
    # Distribution demandée: 60% negative, 40% positive (no neutral).
    sentiment = News.NEGATIVE if random.random() < 0.6 else News.POSITIVE
    
    # Générer la nouvelle
    headline, description, impact_percentage = generate_news_headline(stock.name, sentiment)
    
    # Créer l'enregistrement de la nouvelle
    news = News.objects.create(
        stock=stock,
        headline=headline,
        description=description,
        sentiment=sentiment,
        impact_percentage=impact_percentage,
        ticks_until_effect=2,
        is_price_applied=False,
    )
    return news


def generate_all_news() -> list:
    """Generate news for all active stocks."""
    active_stocks = Stock.objects.filter(is_active=True)
    news_created = []
    
    for stock in active_stocks:
        try:
            news = create_news_and_update_price(stock)
            news_created.append(news)
        except Exception as e:
            print(f"Error creating news for {stock.symbol}: {e}")
    
    return news_created


def create_big_impact_news_for_random_stock() -> News:
    """Create a single news item with large impact for a randomly chosen active stock."""
    active = list(Stock.objects.filter(is_active=True))
    if not active:
        raise RuntimeError("No active stocks available")

    stock = random.choice(active)

    # Distribution demandée: 60% negative, 40% positive (no neutral).
    sentiment = News.NEGATIVE if random.random() < 0.6 else News.POSITIVE

    # Use larger impact ranges for big events
    if sentiment == News.POSITIVE:
        impact = random.uniform(25.0, 55.0)  # +25% to +55%
        template = random.choice(NEWS_TEMPLATES["POSITIVE"]) if NEWS_TEMPLATES.get("POSITIVE") else None
    else:
        impact = random.uniform(-35.0, -18.0)  # -35% to -18%
        template = random.choice(NEWS_TEMPLATES["NEGATIVE"]) if NEWS_TEMPLATES.get("NEGATIVE") else None

    quarter = random.randint(1, 4)
    if template:
        headline = template["headline"].format(company=stock.name, quarter=quarter)
        description = template["description"].format(company=stock.name, quarter=quarter)
    else:
        headline = f"Major Event for {stock.name}"
        description = f"A major event has occurred affecting {stock.name}."

    # Create the news
    news = News.objects.create(
        stock=stock,
        headline=headline,
        description=description,
        sentiment=sentiment,
        impact_percentage=impact,
        ticks_until_effect=2,
        is_price_applied=False,
    )
    return news


def apply_due_news_impacts() -> list:
    """Decrease pending counters each tick and apply impacts when due."""
    applied_news = []
    pending_news = News.objects.filter(is_price_applied=False).select_related("stock")

    for news in pending_news:
        if news.ticks_until_effect > 0:
            news.ticks_until_effect -= 1
            news.save(update_fields=["ticks_until_effect"])

        if news.ticks_until_effect == 0 and not news.is_price_applied:
            stock = news.stock
            old_price = stock.price
            price_change = old_price * Decimal(str(news.impact_percentage)) / Decimal("100")
            new_price = old_price + price_change
            new_price = max(new_price, Decimal("0.01"))
            new_price = new_price.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

            stock.price = new_price
            stock.save(update_fields=["price", "updated_at"])
            StockPrice.objects.create(stock=stock, close=new_price)
            from .simulator import MarketSimulator

            MarketSimulator.initialize_history()
            if stock.pk in MarketSimulator._price_history:
                MarketSimulator._price_history[stock.pk].append(float(new_price))
                if len(MarketSimulator._price_history[stock.pk]) > MarketSimulator.MAX_HISTORY:
                    MarketSimulator._price_history[stock.pk].pop(0)

            news.is_price_applied = True
            news.save(update_fields=["is_price_applied"])
            applied_news.append(news)

    return applied_news
