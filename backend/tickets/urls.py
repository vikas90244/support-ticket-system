from django.urls import path
from .views import TicketDetailView, TicketUpdateView
urlpatterns=[
    path('', TicketDetailView.as_view(), name="ticket-detail"),
    path('<int:pk>/', TicketUpdateView.as_view(), name="update-ticket")
]