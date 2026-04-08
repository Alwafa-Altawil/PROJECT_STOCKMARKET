# pyright: reportIncompatibleVariableOverride=false
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import (
    Forecast,
    Portfolio,
    PortfolioHolding,
    Profile,
    Stock,
    StockPrice,
    Transaction,
)


class StockSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stock
        fields = "__all__"


class StockPriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockPrice
        fields = "__all__"


class PortfolioSerializer(serializers.ModelSerializer):
    holdings_count = serializers.IntegerField(source="holdings.count", read_only=True)

    class Meta:
        model = Portfolio
        fields = "__all__"


class PortfolioHoldingSerializer(serializers.ModelSerializer):
    stock = StockSerializer()

    class Meta:
        model = PortfolioHolding
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

class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["username", "email", "password"]

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        # Safety net: ensure related objects exist even if signals are skipped.
        Profile.objects.get_or_create(user=user)
        Portfolio.objects.get_or_create(user=user)
        return user