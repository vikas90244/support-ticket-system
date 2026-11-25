from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Ticket, Status, Priority, Category
from django.db.models import Q, Count, Min
from .serializers import TicketSerializer
from django.shortcuts import get_object_or_404
from django.utils import timezone

from google.genai.errors import APIError
from .llm import classify_ticket

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

class TicketStatsView(APIView):
    def get(self, request):
        stats= Ticket.objects.aggregate(
            total_tickets=Count("id"),
            open_tickets= Count("id", filter=Q(status=Status.OPEN)),
            first_ticket= Min("created_at")
        )
        avg_tickets_per_day = 0

        if stats["first_ticket"]:
            first_date =timezone.localtime(
                stats["first_ticket"]
            ).date()
            today= timezone.localdate()
            days= (today - first_date).days + 1  #  fixes division by zero error 
            avg_tickets_per_day = round(
                stats["total_tickets"] / days, 1
            )

        # priority count 
        priority_counts=dict(Ticket.objects.values("priority")
                .annotate(count=Count("id"))
                .values_list("priority", "count")
            )
        priority_breakdown = {
        choice.value: priority_counts.get(choice.value, 0)
        for choice in Priority }
        category_counts = dict(
            Ticket.objects.values("category")
            .annotate(count=Count("id"))
            .values_list("category", "count")
        )

        category_breakdown = {
            choice.value: category_counts.get(choice.value, 0)
            for choice in Category
        }

        return Response({
            "total_tickets": stats["total_tickets"],
            "open_tickets": stats["open_tickets"],
            "avg_tickets_per_day": avg_tickets_per_day,
            "priority_breakdown": priority_breakdown,
            "category_breakdown": category_breakdown
        }, status=status.HTTP_200_OK)

class TicketClassifyView(APIView):

    def post(self, request):

        description = request.data.get("description")

        if not isinstance(description, str) or not description.strip():
            return Response(
                {"error": "Description is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            result = classify_ticket(description.strip())

            if result is None:
                return Response(
                    {"error": "Classification failed."},
                    status=status.HTTP_502_BAD_GATEWAY
                )

            return Response({
                "category": result.category,
                "priority": result.priority
            }, status=status.HTTP_200_OK)

        except APIError:
            return Response(
                {"error": "Gemini API is currently unavailable."},
                status=status.HTTP_502_BAD_GATEWAY
            )