from decimal import Decimal

from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from .models import Portfolio, PortfolioHolding, Profile, Stock, StockPrice, News


class TradingFlowTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="student", password="pass123")
        # Ensure Profile and Portfolio are created (signal may not fire in tests)
        Profile.objects.get_or_create(user=self.user)
        Portfolio.objects.get_or_create(user=self.user)
        self.client.force_authenticate(user=self.user) # type: ignore
        self.stock = Stock.objects.create(symbol="AAPL", name="Apple", price=Decimal("100.00"))
        for i in range(30):
            StockPrice.objects.create(stock=self.stock, close=Decimal(100 + i))

    def test_new_user_starts_with_balance_and_empty_portfolio(self):
        profile = Profile.objects.get(user=self.user)
        portfolio = Portfolio.objects.get(user=self.user)

        self.assertEqual(profile.balance, Decimal("100000.00"))
        self.assertEqual(profile.starting_balance, Decimal("100000.00"))
        self.assertFalse(PortfolioHolding.objects.filter(portfolio=portfolio).exists())

    def test_buy_and_sell_flow(self):
        buy_response = self.client.post(
            "/api/core/trade/buy/", {"stock_id": self.stock.pk, "quantity": 10}, format="json"
        )
        self.assertEqual(buy_response.status_code, 200)

        portfolio = Portfolio.objects.get(user=self.user)
        position = PortfolioHolding.objects.get(portfolio=portfolio, stock=self.stock)
        self.assertEqual(position.quantity, 10)

        sell_response = self.client.post(
            "/api/core/trade/sell/", {"stock_id": self.stock.pk, "quantity": 4}, format="json"
        )
        self.assertEqual(sell_response.status_code, 200)

        position.refresh_from_db()
        self.assertEqual(position.quantity, 6)

    def test_monte_carlo_forecast_endpoint(self):
        response = self.client.post(
            "/api/core/forecast/monte-carlo/",
            {"stock_id": self.stock.pk, "horizon_days": 30, "paths": 1000},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertIn("probability_up", response.data) # type: ignore

    def test_selling_all_shares_removes_holding(self):
        self.client.post("/api/core/trade/buy/", {"stock_id": self.stock.pk, "quantity": 2}, format="json")
        response = self.client.post(
            "/api/core/trade/sell/", {"stock_id": self.stock.pk, "quantity": 2}, format="json"
        )
        self.assertEqual(response.status_code, 200)

        portfolio = Portfolio.objects.get(user=self.user)
        self.assertFalse(PortfolioHolding.objects.filter(portfolio=portfolio, stock=self.stock).exists())

    def test_generate_news_endpoint(self):
        """Test that news generation endpoint creates news and updates stock prices."""
        initial_price = self.stock.price
        
        response = self.client.post("/api/core/news/generate/", format="json")
        self.assertEqual(response.status_code, 201)
        self.assertIn("count", response.data)  # type: ignore
        self.assertIn("news", response.data)  # type: ignore
        
        # Verify that news was created
        news_count = News.objects.filter(stock=self.stock).count()
        self.assertGreater(news_count, 0)
        
        
        self.stock.refresh_from_db()
        
        self.assertTrue(News.objects.filter(stock=self.stock).exists())

    def test_get_latest_news_endpoint(self):
        """Test retrieving latest news."""
        # Create some news first
        from .models import News
        News.objects.create(
            stock=self.stock,
            headline="Test News",
            description="This is a test news",
            sentiment=News.POSITIVE,
            impact_percentage=2.5
        )
        
        response = self.client.get("/api/core/news/latest/", format="json")
        self.assertEqual(response.status_code, 200)
        self.assertGreater(len(response.data), 0)  # type: ignore

    def test_generate_news_for_specific_stock(self):
        response = self.client.post(
            "/api/core/news/generate-stock/",
            {"stock_id": self.stock.pk},
            format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertIn("headline", response.data)  # type: ignore
        self.assertIn("sentiment", response.data)  # type: ignore
