from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StockViewSet, PortfolioViewSet
 
router = DefaultRouter()
router.register(r'stocks', StockViewSet)
router.register(r'portfolio', PortfolioViewSet, basename='portfolio') 
urlpatterns = [
    path('api/', include(router.urls)),
]