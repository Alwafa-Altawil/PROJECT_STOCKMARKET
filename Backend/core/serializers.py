from rest_framework import serializers
from .models import *
 
class StockSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stock
        fields = '__all__'
 
class PortfolioSerializer(serializers.ModelSerializer):
    stock = StockSerializer()
 
    class Meta:
        model = Portfolio
        fields = '__all__'