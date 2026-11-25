from django.urls import path
from .views import TicketDetailView, TicketUpdateView, TicketStatsView
urlpatterns=[
    path('', TicketDetailView.as_view(), name="ticket-detail"),
    path('<int:pk>/', TicketUpdateView.as_view(), name="update-ticket"), 
    path('stats/', TicketStatsView.as_view(), name="ticket-stats")
]