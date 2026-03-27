from django.contrib import admin
from .models import (
    Forecast,
    Portfolio,
    PortfolioHolding,
    Profile,
    Stock,
    StockPrice,
    Transaction,
)

# Register your models here.
admin.site.register(Stock)
admin.site.register(StockPrice)
admin.site.register(Portfolio)
admin.site.register(PortfolioHolding)
admin.site.register(Transaction)
admin.site.register(Profile)
admin.site.register(Forecast)
