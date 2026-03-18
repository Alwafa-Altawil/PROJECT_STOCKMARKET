from django.urls import path
from .views import *
 
urlpatterns = [
    path('portfolio/', get_portfolio),
    path('buy/', buy_stock),
]