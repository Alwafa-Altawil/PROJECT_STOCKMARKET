from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE) #user a un seul profile
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=100000) #parametres de la balance de chaque user
    starting_balance = models.DecimalField(max_digits=12, decimal_places=2, default=100000) #balance de départ
    updated_at = models.DateTimeField(auto_now=True) #date de mise à jour

    def __str__(self): #affichage du profile dans l'admin panel
        return f"{self.user.username}'s profile"


class Stock(models.Model):
    symbol = models.CharField(max_length=10, unique=True) #parametres du symbol du stock
    name = models.CharField(max_length=120, blank=True)#parametres du name du stock
    price = models.DecimalField(max_digits=12, decimal_places=2)#parametres du price du stock
    is_active = models.BooleanField(default=True)#parametres de l'activité du stock
    updated_at = models.DateTimeField(auto_now=True)#date de mise à jour

    def __str__(self):#affichage du stock dans l'admin panel
        return self.symbol


class StockPrice(models.Model):
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name="price_history")
    close = models.DecimalField(max_digits=12, decimal_places=2)#parametres du close du stock
    recorded_at = models.DateTimeField(default=timezone.now, db_index=True)#date de l'enregistrement

    class Meta:
        ordering = ["-recorded_at"]#tri par date d'enregistrement


class Portfolio(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="portfolio")#user a un seul portfolio
    stocks = models.ManyToManyField(Stock, through="PortfolioHolding", related_name="portfolios")
    updated_at = models.DateTimeField(auto_now=True)#date de mise à jour

    def __str__(self):#affichage du portfolio dans l'admin panel
        return f"{self.user.username}'s portfolio"


class PortfolioHolding(models.Model):
    portfolio = models.ForeignKey(
        Portfolio, on_delete=models.CASCADE, related_name="holdings"#portfolio a plusieurs holdings
    )
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name="holdings")#stock a plusieurs holdings
    quantity = models.PositiveIntegerField(default=0)#parametres de la quantité du stock
    average_buy_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)#parametres du prix moyen d'achat du stock
    updated_at = models.DateTimeField(auto_now=True)#date de mise à jour

    class Meta:
        unique_together = ("portfolio", "stock")


class Transaction(models.Model):
    BUY = "BUY"
    SELL = "SELL"
    TYPES = (
        (BUY, "Buy"),
        (SELL, "Sell"),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE)#user a plusieurs transactions
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE)#transations des stocks
    quantity = models.PositiveIntegerField()#parametres de la quantité du stock
    price = models.DecimalField(max_digits=12, decimal_places=2)#parametres du prix du stock
    type = models.CharField(max_length=4, choices=TYPES)#parametres du type de transaction
    timestamp = models.DateTimeField(default=timezone.now)#date de la transaction
    notional = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        ordering = ["-timestamp"]#tri par date de transaction


class Forecast(models.Model): #monte carlo forecast
    user = models.ForeignKey(User, on_delete=models.CASCADE)#forecasts des users
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE)
    horizon_days = models.PositiveIntegerField(default=30)#parametres de la durée de la prévision
    paths = models.PositiveIntegerField(default=5000)#parametres du nombre de simulations
    drift = models.FloatField(default=0)
    volatility = models.FloatField(default=0)#parametres de la volatilité du stock
    percentile_5 = models.DecimalField(max_digits=12, decimal_places=2)
    median = models.DecimalField(max_digits=12, decimal_places=2)#parametres de la médiane du stock
    percentile_95 = models.DecimalField(max_digits=12, decimal_places=2)#parametres du 95e percentile du stock
    probability_up = models.FloatField(default=0)
    created_at = models.DateTimeField(default=timezone.now)#date de création

    class Meta:
        ordering = ["-created_at"]#tri par date de création