from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PortfolioViewSet,
    StockViewSet,
    buy_stock,
    create_monte_carlo_forecast,
    generate_news_endpoint,
    generate_news_for_stock,
    get_forecasts,
    get_forecast_paths,
    get_latest_news,
    get_portfolio,
    get_transactions,
    login,
    logout,
    market_tick,
    market_state,
    portfolio_status,
    record_price,
    register,
    seed_stocks,
    sell_stock,
    refresh,
    trigger_big_news,
)

router = DefaultRouter()
router.register(r'stocks', StockViewSet)
router.register(r'portfolio', PortfolioViewSet, basename='portfolio') 
urlpatterns = [
    # Routes spécifiques - DOIVENT être avant include(router.urls)
    path("auth/register/", register),
    path("auth/login/", login),
    path("auth/refresh/", refresh),
    path("auth/logout/", logout),
    path("portfolio/summary/", get_portfolio),
    path("portfolio/status/", portfolio_status),
    path("transactions/", get_transactions),
    path("trade/buy/", buy_stock),
    path("trade/sell/", sell_stock),
    path("prices/record/", record_price),
    path("market/tick/", market_tick),
    path("market/state/", market_state),
    path("forecast/monte-carlo/", create_monte_carlo_forecast),
    path("forecast/history/", get_forecasts),
    path("forecast/<int:forecast_id>/paths/", get_forecast_paths),
    path("news/latest/", get_latest_news),
    path("news/generate/", generate_news_endpoint),
    path("news/generate-stock/", generate_news_for_stock),
    path("news/trigger-big/", trigger_big_news),
    path("seed/stocks/", seed_stocks),
    # Routes du routeur - APRÈS les routes spécifiques
    path('', include(router.urls)),
]