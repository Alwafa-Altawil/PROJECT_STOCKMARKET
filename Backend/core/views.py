from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Stock, Portfolio, Transaction

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def buy_stock(request):
    user = request.user
    stock_id = request.data.get('stock_id')
    quantity = int(request.data.get('quantity', 0))

    try:
        with transaction.atomic(): # Sécurise la transaction SQL
            stock = Stock.objects.select_for_update().get(id=stock_id)
            profile = user.profile
            cost = stock.price * quantity

            if profile.balance < cost:
                return Response({"error": "Solde insuffisant"}, status=400)

            # Mise à jour du profil
            profile.balance -= cost
            profile.save()

            # Mise à jour du portefeuille
            portfolio, created = Portfolio.objects.get_or_create(user=user, stock=stock)
            portfolio.quantity += quantity
            portfolio.save()

            # Historique
            Transaction.objects.create(
                user=user, stock=stock, quantity=quantity, 
                price=stock.price, type='BUY'
            )

            return Response({"success": True, "new_balance": profile.balance})
    except Stock.DoesNotExist:
        return Response({"error": "Action non trouvée"}, status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sell_stock(request):
    user = request.user
    stock_id = request.data.get('stock_id')
    quantity = int(request.data.get('quantity', 0))

    try:
        with transaction.atomic():
            portfolio = Portfolio.objects.get(user=user, stock_id=stock_id)
            
            if portfolio.quantity < quantity:
                return Response({"error": "Pas assez d'actions"}, status=400)

            stock = portfolio.stock
            gain = stock.price * quantity

            # Mise à jour
            portfolio.quantity -= quantity
            portfolio.save()
            
            user.profile.balance += gain
            user.profile.save()

            Transaction.objects.create(
                user=user, stock=stock, quantity=quantity, 
                price=stock.price, type='SELL'
            )

            return Response({"success": True})
    except Portfolio.DoesNotExist:
        return Response({"error": "Vous ne possédez pas cette action"}, status=404)