from decimal import Decimal

from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from .models import Portfolio, PortfolioHolding, Profile, Stock, StockPrice


class TradingFlowTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="student", password="pass123")
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
            "/api/trade/buy/", {"stock_id": self.stock.pk, "quantity": 10}, format="json"
        )
        self.assertEqual(buy_response.status_code, 200)

        portfolio = Portfolio.objects.get(user=self.user)
        position = PortfolioHolding.objects.get(portfolio=portfolio, stock=self.stock)
        self.assertEqual(position.quantity, 10)

        sell_response = self.client.post(
            "/api/trade/sell/", {"stock_id": self.stock.pk, "quantity": 4}, format="json"
        )
        self.assertEqual(sell_response.status_code, 200)

        position.refresh_from_db()
        self.assertEqual(position.quantity, 6)

    def test_monte_carlo_forecast_endpoint(self):
        response = self.client.post(
            "/api/forecast/monte-carlo/",
            {"stock_id": self.stock.pk, "horizon_days": 30, "paths": 1000},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertIn("probability_up", response.data) # type: ignore

    def test_selling_all_shares_removes_holding(self):
        self.client.post("/api/trade/buy/", {"stock_id": self.stock.pk, "quantity": 2}, format="json")
        response = self.client.post(
            "/api/trade/sell/", {"stock_id": self.stock.pk, "quantity": 2}, format="json"
        )
        self.assertEqual(response.status_code, 200)

        portfolio = Portfolio.objects.get(user=self.user)
        self.assertFalse(PortfolioHolding.objects.filter(portfolio=portfolio, stock=self.stock).exists())
