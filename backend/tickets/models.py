from django.db import models

# Create your models here.


class Category(models.TextChoices):
    BILLING = 'billing', 'Billing'
    TECHNICAL = 'technical', 'Technical'
    ACCOUNT = 'account', 'Account'
    GENERAL = 'general', 'General'

class Priority(models.TextChoices):
    LOW="low", "Low"
    MEDIUM="medium", "Medium"
    HIGH= "high", "High"
    CRITICAL= "critical", "Critical"

class Status(models.TextChoices):
    OPEN="open", "Open"
    IN_PROGRESS="in_progress", "In Progress"
    RESOLVED="resolved", "Resolved"
    CLOSED="closed", "Closed"
class Ticket(models.Model):
    title=models.CharField(max_length=200, null=False)
    description= models.TextField(null=False)
    category=models.CharField(max_length=25, choices=Category.choices, default=Category.GENERAL)
    priority=models.CharField(max_length=25, choices=Priority.choices, default=Priority.MEDIUM)
    status=models.CharField(max_length=25, choices=Status.choices, default=Status.OPEN)
    created_at= models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} |  {self.category} - {self.priority}({self.status})"