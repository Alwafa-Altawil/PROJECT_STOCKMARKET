from django.contrib import admin
from .models import Stock, StockPrice, Portfolio, Transaction, Profile, Forecast

# Register your models here.
admin.site.register(Stock)
admin.site.register(StockPrice)
admin.site.register(Portfolio)
admin.site.register(Transaction)
admin.site.register(Profile)
admin.site.register(Forecast)
