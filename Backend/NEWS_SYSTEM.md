# Système de Nouvelles du Marché Boursier

## Overview
Le système de nouvelles génère automatiquement des nouvelles qui affectent les prix des stocks en temps réel, simulant un vrai marché financier.

## Caractéristiques
- **Génération aléatoire de nouvelles** : chaque nouvelle est générée de manière aléatoire avec des titres et descriptions réalistes
- **Impact sur les prix** : chaque nouvelle met à jour immédiatement le prix du stock affecté
- **Sentiments variés** : 
  - 60% positives (font monter les prix)
  - 30% négatives (font baisser les prix)
  - 10% neutres (peu d'impact)
- **Historique complet** : toutes les nouvelles sont enregistrées avec timestamp

## Endpoints API

### 1. Générer des nouvelles pour tous les stocks
```
POST /api/core/news/generate/
```
Génère une nouvelle pour chaque stock actif et met à jour leurs prix.

**Réponse exemple:**
```json
{
  "success": true,
  "count": 5,
  "news": [
    {
      "id": 1,
      "stock": {
        "id": 1,
        "symbol": "AAPL",
        "name": "Apple Inc.",
        "price": "185.50"
      },
      "headline": "Apple Inc. Reports Record-Breaking Quarterly Earnings",
      "description": "Apple exceeded analyst expectations...",
      "sentiment": "POSITIVE",
      "impact_percentage": 2.5,
      "created_at": "2026-04-29T18:27:06.349153Z"
    }
  ]
}
```

### 2. Générer une nouvelle pour un stock spécifique
```
POST /api/core/news/generate-stock/
Content-Type: application/json

{
  "stock_id": 1
}
```

**Réponse exemple:**
```json
{
  "id": 2,
  "stock": {
    "id": 1,
    "symbol": "AAPL",
    "price": "182.30"
  },
  "headline": "Apple Inc. Announces Major Product Launch",
  "description": "The company unveiled its latest innovation...",
  "sentiment": "POSITIVE",
  "impact_percentage": 1.8,
  "created_at": "2026-04-29T18:30:12.123456Z"
}
```

### 3. Récupérer les dernières nouvelles
```
GET /api/core/news/latest/?stock_id=1&limit=50
```

Paramètres:
- `stock_id` (optionnel): filtrer par stock
- `limit` (optionnel, défaut: 50): nombre de nouvelles à retourner

**Réponse exemple:**
```json
[
  {
    "id": 2,
    "stock": {...},
    "headline": "...",
    "description": "...",
    "sentiment": "POSITIVE",
    "impact_percentage": 1.8,
    "created_at": "2026-04-29T18:30:12.123456Z"
  }
]
```

## Utilisation en ligne de commande

### Générer les nouvelles via la commande Django
```bash
python manage.py generate_news
```

### Automatiser la génération chaque minute (Linux/Mac)
Ajoutez cette ligne à votre crontab:
```
* * * * * cd /path/to/PROJECT_STOCKMARKET/Backend && python manage.py generate_news
```

### Automatiser sur Windows
Utilisez Task Scheduler pour exécuter la commande chaque minute:
```
python manage.py generate_news
```

## Structure du Modèle News

```python
class News(models.Model):
    stock = models.ForeignKey(Stock)  # Stock affecté
    headline = models.CharField(max_length=255)  # Titre
    description = models.TextField()  # Description
    sentiment = models.CharField(choices=['POSITIVE', 'NEGATIVE', 'NEUTRAL'])  # Sentiment
    impact_percentage = models.FloatField()  # Impact sur le prix (%)
    created_at = models.DateTimeField(auto_now_add=True)  # Date/heure
```

## Exemples de Nouvelles Générées

### Positives (60%)
- "Apple Inc. Reports Record-Breaking Quarterly Earnings"
- "Microsoft Corp. Receives Strategic Partnership"
- "Alphabet Inc. Achieves Sustainability Milestone"

### Négatives (30%)
- "Tesla Inc. Misses Earnings Expectations"
- "Amazon Inc. Issues Product Recall"
- "Tesla Inc. Faces Regulatory Investigation"

### Neutres (10%)
- "Apple Inc. Announces Dividend Payment"
- "Microsoft Corp. Holds Annual Shareholder Meeting"

## Impact sur les Stocks

Quand une nouvelle est générée:
1. Un sentiment est aléatoirement choisi (60/30/10)
2. Un impact en pourcentage est calculé
3. Le prix du stock est mis à jour
4. Le nouvel historique est sauvegardé dans StockPrice

### Ranges d'impact par sentiment
- **POSITIVE**: +0.8% à +4.5%
- **NEGATIVE**: -4.5% à -1.0%
- **NEUTRAL**: -0.5% à +0.5%

## Tests

Exécuter les tests des nouvelles:
```bash
python manage.py test core.tests.TradingFlowTests.test_generate_news_endpoint
python manage.py test core.tests.TradingFlowTests.test_get_latest_news_endpoint
python manage.py test core.tests.TradingFlowTests.test_generate_news_for_specific_stock
```

## Intégration Future

Pour une automatisation complète, considérez:
1. **Celery + Redis**: pour tâches planifiées distribuées
2. **APScheduler**: pour planification locale
3. **WebSockets**: pour notifier les clients en temps réel des nouvelles

## Prochaines Étapes
- [ ] Ajouter des WebSockets pour notifier les clients
- [ ] Créer une tâche Celery pour l'automatisation
- [ ] Ajouter un endpoint pour filtrer par date
- [ ] Ajouter des statistiques sur l'impact des nouvelles
