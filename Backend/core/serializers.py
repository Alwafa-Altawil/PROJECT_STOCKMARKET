# pyright: reportIncompatibleVariableOverride=false
from rest_framework import serializers
from .models import Forecast, Portfolio, Profile, Stock, StockPrice, Transaction


class StockSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stock
        fields = "__all__"


class StockPriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockPrice
        fields = "__all__"


class PortfolioSerializer(serializers.ModelSerializer):
    stock = StockSerializer()

    class Meta:
        model = Portfolio
        fields = "__all__"


class TransactionSerializer(serializers.ModelSerializer):
    stock = StockSerializer()

    class Meta:
        model = Transaction
        fields = "__all__"


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = "__all__"


class ForecastSerializer(serializers.ModelSerializer):
    stock = StockSerializer()

    class Meta:
        model = Forecast
        fields = "__all__"
