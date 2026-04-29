# 🚀 Guide Utilisation du Système de Nouvelles

## Démarrage Rapide

### 1. Via l'API (Simple)
```bash
# Générer les nouvelles
curl -X POST http://localhost:8000/api/core/news/generate/

# Récupérer les nouvelles
curl http://localhost:8000/api/core/news/latest/
```

### 2. Via la Ligne de Commande
```bash
cd Backend
.\env\Scripts\activate
python manage.py generate_news
```

### 3. Automatisation Chaque Minute

#### Option A: Script Python (Recommandé pour le développement)
```bash
cd Backend
.\env\Scripts\activate
python news_scheduler.py
```
Cela affiche les nouvelles générées en temps réel avec formatting.

#### Option B: Batch Script Windows (Pour Task Scheduler)
1. Double-cliquez sur `run_news_generator.bat`
2. Le script génère les nouvelles chaque minute indéfiniment

#### Option C: Windows Task Scheduler (Production)
1. Ouvrez Task Scheduler
2. Créez une nouvelle tâche
3. Définissez le déclencheur: "Chaque minute" ou "Toutes les 60 secondes"
4. Action: Exécuter `run_news_generator.bat`

## Structure de Réponse

### POST /api/core/news/generate/
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
      "description": "Apple exceeded analyst expectations with strong Q2 results, demonstrating robust market demand and operational efficiency.",
      "sentiment": "POSITIVE",
      "impact_percentage": 2.5,
      "created_at": "2026-04-29T18:27:06.349153Z"
    }
  ]
}
```

### GET /api/core/news/latest/?stock_id=1&limit=10
```json
[
  {
    "id": 1,
    "stock": {...},
    "headline": "...",
    "description": "...",
    "sentiment": "POSITIVE",
    "impact_percentage": 2.5,
    "created_at": "2026-04-29T18:27:06.349153Z"
  }
]
```

## 📊 Impact sur les Prix

Quand une nouvelle est générée pour un stock:

1. **Calcul du prix**:
   ```
   nouveau_prix = prix_actuel × (1 + impact_percentage/100)
   ```

2. **Exemple**:
   - Stock à $100
   - Nouvelle: "Major Product Launch" (+2.5%)
   - Nouveau prix: $100 × 1.025 = $102.50

3. **Enregistrement**:
   - Le nouveau prix est sauvegardé dans `Stock.price`
   - Un enregistrement est créé dans `StockPrice` (historique)

## 🎭 Types de Nouvelles

### Positives (60%)
- "Reports Record-Breaking Quarterly Earnings"
- "Announces Major Product Launch"
- "Receives Strategic Partnership"
- "Stock Upgraded by Leading Analyst"
- "Achieves Sustainability Milestone"
- "Expands into New Market"

### Négatives (30%)
- "Misses Earnings Expectations"
- "Issues Product Recall"
- "Faces Regulatory Investigation"
- "Stock Downgraded by Major Analyst Firm"
- "CEO Steps Down"
- "Reports Operating Loss"
- "Loses Major Customer"

### Neutres (10%)
- "Announces Dividend Payment"
- "Holds Annual Shareholder Meeting"
- "Reports Market Research Update"

## 🧪 Tests

```bash
# Tous les tests
python manage.py test core.tests.TradingFlowTests

# Tests des nouvelles uniquement
python manage.py test core.tests.TradingFlowTests.test_generate_news_endpoint
python manage.py test core.tests.TradingFlowTests.test_get_latest_news_endpoint
python manage.py test core.tests.TradingFlowTests.test_generate_news_for_specific_stock
```

## 🐛 Dépannage

### "Cannot import News"
```bash
# Nettoyez le cache Python
Get-ChildItem -Path . -Recurse -Filter __pycache__ -Directory | Remove-Item -Recurse -Force

# Réappliquez les migrations
python manage.py migrate
```

### Le serveur n'existe pas
```bash
# Démarrez le serveur
python manage.py runserver
```

### Port 8000 occupé
```bash
# Changez le port
python manage.py runserver 8001
```

## 📝 Notes d'Implémentation

- Les nouvelles sont générées **indépendamment** pour chaque stock actif
- Les prix sont mis à jour **instantanément**
- L'historique des prix est conservé dans `StockPrice`
- Le système simule les conditions réelles du marché
- Les nouvelles affectent immédiatement le portefeuille des utilisateurs (valeur de marché)

## 🔗 Endpoints Complets

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/core/news/generate/` | Générer les nouvelles pour tous les stocks |
| POST | `/api/core/news/generate-stock/` | Générer une nouvelle pour un stock |
| GET | `/api/core/news/latest/` | Récupérer les dernières nouvelles |

## 🚦 Prochaines Étapes

1. **Intégration Frontend**: Afficher les nouvelles en temps réel
2. **WebSockets**: Notifier les clients en direct
3. **Analytics**: Graphiques d'impact des nouvelles
4. **Notifications**: Alertes pour les mouvements importants

## 📞 Support

Pour toute question, consultez:
- `NEWS_SYSTEM.md`: Documentation technique complète
- `IMPLEMENTATION.md`: Détails de l'implémentation
- `core/news_generator.py`: Code source principal
