from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=100000)
    starting_balance = models.DecimalField(max_digits=12, decimal_places=2, default=100000)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s profile"


class Stock(models.Model):
    symbol = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=120, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.symbol


class StockPrice(models.Model):
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name="price_history")
    close = models.DecimalField(max_digits=12, decimal_places=2)
    recorded_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["-recorded_at"]


class Portfolio(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="portfolio")
    stocks = models.ManyToManyField(Stock, through="PortfolioHolding", related_name="portfolios")
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s portfolio"


class PortfolioHolding(models.Model):
    portfolio = models.ForeignKey(
        Portfolio, on_delete=models.CASCADE, related_name="holdings"
    )
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name="holdings")
    quantity = models.PositiveIntegerField(default=0)
    average_buy_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("portfolio", "stock")


class Transaction(models.Model):
    BUY = "BUY"
    SELL = "SELL"
    TYPES = (
        (BUY, "Buy"),
        (SELL, "Sell"),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=12, decimal_places=2)
    type = models.CharField(max_length=4, choices=TYPES)
    timestamp = models.DateTimeField(default=timezone.now)
    notional = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        ordering = ["-timestamp"]


class Forecast(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE)
    horizon_days = models.PositiveIntegerField(default=30)
    paths = models.PositiveIntegerField(default=5000)
    drift = models.FloatField(default=0)
    volatility = models.FloatField(default=0)
    percentile_5 = models.DecimalField(max_digits=12, decimal_places=2)
    median = models.DecimalField(max_digits=12, decimal_places=2)
    percentile_95 = models.DecimalField(max_digits=12, decimal_places=2)
    probability_up = models.FloatField(default=0)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]


@receiver(post_save, sender=User)
def create_profile_and_portfolio(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)
        Portfolio.objects.create(user=instance)