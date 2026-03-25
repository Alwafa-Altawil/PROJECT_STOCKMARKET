from django.contrib import admin
from .models import Profile, Stock, Portfolio, Transaction

admin.site.register(Profile)
admin.site.register(Stock)
admin.site.register(Portfolio)
admin.site.register(Transaction)