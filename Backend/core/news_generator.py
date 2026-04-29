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
            "impact_range": (1.5, 4.5),
        },
        {
            "headline": "{company} Announces Major Product Launch",
            "description": "The company unveiled its latest innovation, expected to capture significant market share and drive future growth.",
            "impact_range": (1.0, 3.5),
        },
        {
            "headline": "{company} Receives Strategic Partnership",
            "description": "{company} has entered into a strategic partnership that strengthens its market position and expands revenue opportunities.",
            "impact_range": (1.5, 3.0),
        },
        {
            "headline": "{company} Stock Upgraded by Leading Analyst",
            "description": "A major investment bank upgraded {company}'s rating, citing strong fundamentals and growth prospects.",
            "impact_range": (1.0, 2.5),
        },
        {
            "headline": "{company} Achieves Sustainability Milestone",
            "description": "{company} announced significant progress on environmental goals, attracting ESG-focused investors.",
            "impact_range": (0.8, 2.0),
        },
        {
            "headline": "{company} Expands into New Market",
            "description": "The company is entering a high-growth market, positioning itself for long-term expansion and revenue diversification.",
            "impact_range": (1.2, 3.0),
        },
    ],
    "NEGATIVE": [
        {
            "headline": "{company} Misses Earnings Expectations",
            "description": "{company} reported Q{quarter} earnings below analyst consensus, citing supply chain challenges and reduced consumer spending.",
            "impact_range": (-4.5, -1.5),
        },
        {
            "headline": "{company} Issues Product Recall",
            "description": "The company announced a voluntary recall of certain products due to quality concerns, affecting customer confidence.",
            "impact_range": (-3.5, -1.0),
        },
        {
            "headline": "{company} Faces Regulatory Investigation",
            "description": "{company} is under investigation by regulatory authorities regarding compliance matters.",
            "impact_range": (-4.0, -2.0),
        },
        {
            "headline": "{company} Stock Downgraded by Major Analyst Firm",
            "description": "A leading investment bank downgraded {company}'s rating, citing weakening fundamentals and competitive pressures.",
            "impact_range": (-3.0, -1.0),
        },
        {
            "headline": "{company} CEO Steps Down",
            "description": "{company}'s CEO announced resignation, citing strategic differences. Leadership transition raises uncertainty.",
            "impact_range": (-2.5, -1.5),
        },
        {
            "headline": "{company} Reports Operating Loss",
            "description": "{company} posted an operating loss in the latest quarter, prompting cost-cutting measures and strategic review.",
            "impact_range": (-3.5, -2.0),
        },
        {
            "headline": "{company} Loses Major Customer",
            "description": "A significant customer announced discontinuation of business with {company}, impacting future revenue.",
            "impact_range": (-3.0, -1.5),
        },
    ],
    "NEUTRAL": [
        {
            "headline": "{company} Announces Dividend Payment",
            "description": "{company}'s board approved dividend payment, demonstrating confidence in cash generation capabilities.",
            "impact_range": (-0.5, 0.5),
        },
        {
            "headline": "{company} Holds Annual Shareholder Meeting",
            "description": "{company} held its annual meeting, with investors approving management proposals.",
            "impact_range": (-0.3, 0.3),
        },
        {
            "headline": "{company} Reports Market Research Update",
            "description": "Industry analysts publish research update on {company}, maintaining neutral stance on valuation.",
            "impact_range": (-0.5, 0.5),
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
    """Create a news item and update the stock price accordingly."""
    
    # Déterminer le sentiment aléatoirement (60% positive, 30% negative, 10% neutral)
    rand = random.random()
    if rand < 0.6:
        sentiment = News.POSITIVE
    elif rand < 0.9:
        sentiment = News.NEGATIVE
    else:
        sentiment = News.NEUTRAL
    
    # Générer la nouvelle
    headline, description, impact_percentage = generate_news_headline(stock.name, sentiment)
    
    # Créer l'enregistrement de la nouvelle
    news = News.objects.create(
        stock=stock,
        headline=headline,
        description=description,
        sentiment=sentiment,
        impact_percentage=impact_percentage,
    )
    
    # Calculer le nouveau prix
    old_price = stock.price
    price_change = old_price * Decimal(impact_percentage) / Decimal("100")
    new_price = old_price + price_change
    
    # S'assurer que le prix ne descend pas en dessous de 0.01
    new_price = max(new_price, Decimal("0.01"))
    new_price = new_price.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    
    # Mettre à jour le prix du stock
    stock.price = new_price
    stock.save()
    
    # Enregistrer le nouveau prix dans l'historique
    StockPrice.objects.create(stock=stock, close=new_price)
    
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
