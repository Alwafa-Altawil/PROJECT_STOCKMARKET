from django.contrib import admin
from .models import ( #imported models de the models.py
    Forecast,
    Portfolio,
    PortfolioHolding,
    Profile,
    Stock,
    StockPrice,
    Transaction,
)

#register les models dans l'admin panel
admin.site.register(Stock)
admin.site.register(StockPrice)
admin.site.register(Portfolio)
admin.site.register(PortfolioHolding)
admin.site.register(Transaction)
admin.site.register(Profile)
admin.site.register(Forecast)
