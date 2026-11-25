from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Ticket
from django.db.models import Q 
from .serializers import TicketSerializer
from django.shortcuts import get_object_or_404
# Create your views here.

class TicketDetailView(APIView):
    def post(self, request):
        serializer = TicketSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()

            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST)

    
    def get(self, request):
        status_param = request.query_params.get("status")
        search = request.query_params.get("search")
        category=request.query_params.get("category")
        priority=request.query_params.get("priority")
               
        tickets= Ticket.objects.all()
        if status_param:
            tickets= tickets.filter(status=status_param)
        if category:
            tickets= tickets.filter(category=category)
        if priority:
            tickets.filter(priority=priority)

        if search:
            tickets= tickets.filter(
                Q(title__icontains=search)|
                Q(description__icontains=search)
            )
        tickets = tickets.order_by("-created_at")
        serializer = TicketSerializer(tickets, many=True)

        return Response(
           serializer.data,
            status=status.HTTP_200_OK
        )

class TicketUpdateView(APIView):

    def patch(self, request, pk):
        ticket = get_object_or_404(Ticket, pk=pk)

        serializer = TicketSerializer(
            ticket,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            serializer.save()

            return Response(
                serializer.data,
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )