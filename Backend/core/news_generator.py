"""News generator service for stock market simulation."""

import random
from decimal import Decimal, ROUND_HALF_UP
from typing import Tuple

from .models import News, Stock, StockPrice

# Banque de scripts pour les nouvelles aléatoirement générées a n'importe quel stock.
NEWS_TEMPLATES = {
    "POSITIVE": [
        {
            "headline": "{company} Annonce des Résultats Trimestriels Record",
            "description": "{company} a dépassé les attentes des analystes avec des résultats solides au Q{quarter}, démontrant une demande de marché robuste et une efficacité opérationnelle remarquable.",
            "impact_range": (12.0, 28.0),
        },
        {
            "headline": "{company} Lance un Produit Majeur",
            "description": "L'entreprise a dévoilé son dernier produit innovant, censé capturer une part de marché importante et favoriser une croissance future.",
            "impact_range": (10.0, 24.0),
        },
        {
            "headline": "{company} Noue un Partenariat Stratégique",
            "description": "{company} a conclu un partenariat stratégique qui renforce sa position de marché et élargit les opportunités de revenus.",
            "impact_range": (11.0, 25.0),
        },
        {
            "headline": "{company} Obtient une Évaluation Positive d'Analystes",
            "description": "Une grande banque d'investissement a amélioré l'évaluation de {company}, citant des fondamentaux solides et des perspectives de croissance.",
            "impact_range": (8.0, 20.0),
        },
        {
            "headline": "{company} Atteint une Étape Importante en Durabilité",
            "description": "{company} a annoncé des progrès significatifs sur ses objectifs environnementaux, attirant les investisseurs axés sur l'ESG.",
            "impact_range": (7.0, 18.0),
        },
        {
            "headline": "{company} S'Expande sur un Nouveau Marché",
            "description": "L'entreprise pénètre un marché à forte croissance, se positionnant pour une expansion à long terme et une diversification des revenus.",
            "impact_range": (10.0, 24.0),
        },
        {
            "headline": "{company} Remporte un Contrat Majeur",
            "description": "{company} a remporté un contrat commercial significatif avec un client international, renforçant sa position concurrentielle.",
            "impact_range": (13.0, 26.0),
        },
        {
            "headline": "{company} Bénéficie d'une Recommandation d'Achat",
            "description": "Un cabinet de recherche réputé a initié une recommandation d'achat sur {company}, soulignant son potentiel de croissance.",
            "impact_range": (9.0, 22.0),
        },
        {
            "headline": "{company} Annonce une Augmentation de Dividende",
            "description": "Le conseil d'administration de {company} a approuvé une augmentation significative du dividende, reflétant une confiance accrue.",
            "impact_range": (8.0, 19.0),
        },
        {
            "headline": "{company} Réalise une Acquisition Stratégique",
            "description": "{company} a acquis une entreprise complémentaire pour renforcer sa présence et ses capacités technologiques.",
            "impact_range": (11.0, 27.0),
        },
        {
            "headline": "{company} Dépasse ses Objectifs de Ventes",
            "description": "Au Q{quarter}, {company} a dépassé ses prévisions de ventes grâce à une demande client exceptionnelle.",
            "impact_range": (10.0, 23.0),
        },
        {
            "headline": "{company} Lance une Initiative d'Innovation",
            "description": "{company} investit massivement dans la recherche et développement, annonçant des solutions révolutionnaires.",
            "impact_range": (12.0, 25.0),
        },
    ],
    "NEGATIVE": [
        {
            "headline": "{company} Manque les Attentes de Résultats",
            "description": "{company} a publié des résultats du Q{quarter} en dessous du consensus des analystes, invoquant des défis de chaîne d'approvisionnement.",
            "impact_range": (-18.0, -8.0),
        },
        {
            "headline": "{company} Émet un Rappel de Produit",
            "description": "L'entreprise a annoncé un rappel volontaire de certains produits en raison de préoccupations qualité affectant la confiance des clients.",
            "impact_range": (-16.0, -7.0),
        },
        {
            "headline": "{company} Fait Face à une Enquête Réglementaire",
            "description": "{company} est le sujet d'une enquête menée par les autorités réglementaires concernant des enjeux de conformité.",
            "impact_range": (-20.0, -10.0),
        },
        {
            "headline": "{company} Est Dégradée par un Cabinet d'Analyse Majeur",
            "description": "Une grande banque d'investissement a dégradé l'évaluation de {company}, citant des fondamentaux affaiblis et des pressions concurrentielles.",
            "impact_range": (-15.0, -6.0),
        },
        {
            "headline": "Le PDG de {company} Se Retire",
            "description": "Le PDG de {company} a annoncé sa démission, invoquant des divergences stratégiques. La transition de leadership suscite des incertitudes.",
            "impact_range": (-14.0, -6.0),
        },
        {
            "headline": "{company} Déclare une Perte Opérationnelle",
            "description": "{company} a enregistré une perte d'exploitation au dernier trimestre, incitant à des mesures de réduction des coûts.",
            "impact_range": (-18.0, -8.0),
        },
        {
            "headline": "{company} Perd un Client Majeur",
            "description": "Un client significatif a annoncé l'arrêt de ses relations commerciales avec {company}, impactant les revenus futurs.",
            "impact_range": (-15.0, -7.0),
        },
        {
            "headline": "{company} Subit des Fermetures d'Usines",
            "description": "{company} a annoncé des fermetures d'installations de production suite à des difficultés financières.",
            "impact_range": (-17.0, -8.0),
        },
        {
            "headline": "{company} Réduit ses Prévisions d'Année Complète",
            "description": "Le management de {company} a abaissé ses prévisions de résultats pour l'exercice complet en raison d'une demande affaiblie.",
            "impact_range": (-19.0, -9.0),
        },
        {
            "headline": "{company} Révèle des Problèmes de Conformité",
            "description": "Des violations potentielles de conformité ont été découvertes chez {company}, entraînant une enquête interne.",
            "impact_range": (-16.0, -8.0),
        },
        {
            "headline": "{company} Confrontée à un Procès Collectif",
            "description": "Des actionnaires ont engagé une action collective contre {company} pour traçabilité insuffisante.",
            "impact_range": (-14.0, -7.0),
        },
        {
            "headline": "{company} Perd sa Position de Marché",
            "description": "Un concurrent majeur a supplanté {company} en tant que leader du marché au Q{quarter}.",
            "impact_range": (-16.0, -8.0),
        },
    ],
    "NEUTRAL": [
        {
            "headline": "{company} Annonce un Paiement de Dividende",
            "description": "Le conseil d'administration de {company} a approuvé le versement d'un dividende, démontrant une confiance dans les capacités de génération de trésorerie.",
            "impact_range": (-3.0, 3.0),
        },
        {
            "headline": "{company} Tient son Assemblée Générale Annuelle",
            "description": "{company} a tenu son assemblée générale annuelle, les actionnaires approuvant les propositions de gestion.",
            "impact_range": (-2.0, 2.0),
        },
        {
            "headline": "{company} Publie une Mise à Jour d'Étude de Marché",
            "description": "Les analystes du secteur publient une mise à jour de recherche sur {company}, maintenant une position neutre sur la valorisation.",
            "impact_range": (-3.0, 3.0),
        },
        {
            "headline": "{company} Change de Direction Stratégique",
            "description": "{company} annonce un changement de direction stratégique, les analystes restant neutres sur l'impact à court terme.",
            "impact_range": (-2.0, 2.0),
        },
        {
            "headline": "{company} Renouvelle son Équipe Exécutive",
            "description": "{company} a nommé plusieurs nouveaux cadres supérieurs pour renforcer sa structure organisationnelle.",
            "impact_range": (-1.0, 2.0),
        },
    ],
}

# générer une nouvelle aléatoire pour une entreprise donnée
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
    
    #60% negative, 40% positive
    sentiment = News.NEGATIVE if random.random() < 0.6 else News.POSITIVE
    
    #Générer la nouvelle
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

    #  60% negative, 40% positive
    sentiment = News.NEGATIVE if random.random() < 0.6 else News.POSITIVE

    # Impact sur des nouvelles sur les prix
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

# impact des nouvelles sur les prix, appliqué après un délai de tick
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
