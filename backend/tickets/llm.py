from django.conf import settings 
from google import genai
from google.genai import types
from pydantic import BaseModel
from typing import Literal


client = genai.Client(
    api_key=settings.GEMINI_API_KEY
)


class TicketClassification(BaseModel):
    category: Literal[
        "billing",
        "technical",
        "account",
        "general"
    ]

    priority: Literal[
        "low",
        "medium",
        "high",
        "critical"
    ]


def classify_ticket(description: str):

    prompt = f"""
    You are a customer support ticket classification system.

    Analyze the following customer problem and classify it.

    CATEGORY DEFINITIONS:

    - billing: Payments, refunds, invoices, subscriptions.
    - technical: Bugs, errors, crashes, application failures.
    - account: Login, registration, password, account access, password-reset.
    - general: Other inquiries.

    PRIORITY DEFINITIONS:

    - low: General questions or minor issues.
    - medium: Normal issues affecting some functionality.
    - high: Major functionality affected or urgent problems.
    - critical: Complete service outage, severe business impact or urgent security-related incidents.

    Classify based on the actual impact described.
    Do not assume urgency without evidence.

    Customer description:
    {description}
    """

    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=TicketClassification,
            temperature=0.1
        )
    )

    return response.parsed
