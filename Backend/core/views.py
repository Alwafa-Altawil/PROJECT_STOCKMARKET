from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import *
from .serializers import *
 
@api_view(['GET'])
def get_portfolio(request):
    data = Portfolio.objects.filter(user=request.user)
    serializer = PortfolioSerializer(data, many=True)
    return Response(serializer.data)
 
 
@api_view(['POST'])
def buy_stock(request):
    user = request.user
    stock_id = request.data['stock_id']
    quantity = int(request.data['quantity'])
 
    stock = Stock.objects.get(id=stock_id)
    profile = user.profile
 
    cost = stock.price * quantity
 
    if profile.balance < cost:
        return Response({"error": "Not enough balance"})
 
    profile.balance -= cost
    profile.save()
 
    portfolio, _ = Portfolio.objects.get_or_create(
        user=user,
        stock=stock
    )
 
    portfolio.quantity += quantity
    portfolio.save()
 
    Transaction.objects.create(
        user=user,
        stock=stock,
        quantity=quantity,
        price=stock.price,
        type='BUY'
    )
 
    return Response({"success": True})