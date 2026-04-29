# pyright: reportIncompatibleVariableOverride=false
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import (
    Forecast,
    News,
    Portfolio,
    PortfolioHolding,
    Profile,
    Stock,
    StockPrice,
    Transaction,
)


class StockSerializer(serializers.ModelSerializer): #serializer pour les stocks
    class Meta:
        model = Stock
        fields = "__all__"


class StockPriceSerializer(serializers.ModelSerializer): #serializer pour les prix des stocks
    class Meta:
        model = StockPrice
        fields = "__all__"


class PortfolioSerializer(serializers.ModelSerializer): #serializer pour les portfolios
    holdings_count = serializers.IntegerField(source="holdings.count", read_only=True)

    class Meta:
        model = Portfolio
        fields = "__all__"


class PortfolioHoldingSerializer(serializers.ModelSerializer): #serializer pour les holdings des portfolios
    stock = StockSerializer()

    class Meta:
        model = PortfolioHolding
        fields = "__all__"


class TransactionSerializer(serializers.ModelSerializer): #serializer pour les transactions
    stock = StockSerializer()

    class Meta:
        model = Transaction
        fields = "__all__"


class ProfileSerializer(serializers.ModelSerializer): #serializer pour les profiles
    class Meta:
        model = Profile
        fields = "__all__"


class ForecastSerializer(serializers.ModelSerializer): #serializer pour les forecasts
    stock = StockSerializer()

    class Meta:
        model = Forecast
        fields = "__all__"


class NewsSerializer(serializers.ModelSerializer): #serializer pour les nouvelles
    stock = StockSerializer()

    class Meta:
        model = News
        fields = "__all__"

class RegisterSerializer(serializers.ModelSerializer): #serializer pour les inscriptions des nouveaux utilisateurs
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True)

    class Meta: #mettre les champs dans le serializer
        model = User
        fields = ["username", "email", "password"]

    def validate_email(self, value): #valider l'email avec des règles
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():   #si l'email existe déjà, renvoyer une erreur
            raise serializers.ValidationError("A user with this email already exists.") #message d'erreur
        return email

    def validate_username(self, value): #valider le username avec des règles
        if User.objects.filter(username__iexact=value).exists(): #si le username existe déjà, renvoyer une erreur
            raise serializers.ValidationError("A user with this username already exists.") #message d'erreur
        return value

    def validate_password(self, value): #valider le mot de passe avec des règles
        validate_password(value)
        return value

    def create(self, validated_data): #créer un nouvel utilisateur
        # Use create_user to ensure password is hashed. Do not create Profile/Portfolio here
        # because a post_save signal on User already handles that; creating them twice
        # can cause integrity issues or unexpected behavior during registration.
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )

        return user