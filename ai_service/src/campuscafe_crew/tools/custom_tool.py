"""
Custom tools for CampusCafe AI Crew.
These tools connect the AI agents to the CampusCafe backend API.
"""

import os
import json
import requests
from crewai.tools import BaseTool
from typing import Type, Optional
from pydantic import BaseModel, Field


# --- Backend API Base URL ---
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000")


# ============================================================
# Tool 1: Menu Search Tool
# ============================================================
class MenuSearchInput(BaseModel):
    """Input schema for MenuSearchTool."""
    cafe_id: Optional[str] = Field(
        default=None,
        description="The ID of the cafe to search menu for. If not provided, searches all cafes."
    )
    max_price: Optional[float] = Field(
        default=None,
        description="Maximum price filter in TL."
    )
    category: Optional[str] = Field(
        default=None,
        description="Category filter (e.g., 'yiyecek', 'icecek')."
    )


class MenuSearchTool(BaseTool):
    name: str = "menu_search"
    description: str = (
        "Searches the CampusCafe menu for available items. "
        "Can filter by cafe, price range, and category. "
        "Returns a list of menu items with prices and availability."
    )
    args_schema: Type[BaseModel] = MenuSearchInput

    def _run(self, cafe_id: str = None, max_price: float = None, category: str = None) -> str:
        try:
            url = f"{BACKEND_URL}/api/products"
            params = {}
            if cafe_id:
                params["cafe_id"] = cafe_id
            if category:
                params["category"] = category

            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            products = response.json()

            # Filter by max_price if provided
            if max_price:
                products = [p for p in products if p.get("price", 0) <= max_price]

            if not products:
                return "No menu items found matching the criteria."

            result = "Available Menu Items:\n"
            for p in products:
                result += (
                    f"- {p.get('name', 'Unknown')} | "
                    f"Price: {p.get('price', 'N/A')} TL | "
                    f"Category: {p.get('category', 'N/A')} | "
                    f"Available: {'Yes' if p.get('isAvailable', True) else 'No'}\n"
                )
            return result

        except requests.RequestException as e:
            print(f"❌ MenuSearchTool hatası: {e}")
            return f"Error fetching menu: {str(e)}"


# ============================================================
# Tool 2: Order History Tool
# ============================================================
class OrderHistoryInput(BaseModel):
    """Input schema for OrderHistoryTool."""
    user_id: str = Field(
        description="The ID of the user whose order history to retrieve."
    )
    limit: Optional[int] = Field(
        default=10,
        description="Maximum number of recent orders to return."
    )


class OrderHistoryTool(BaseTool):
    name: str = "order_history"
    description: str = (
        "Retrieves the order history for a specific user. "
        "Returns past orders with items, prices, timestamps, and status."
    )
    args_schema: Type[BaseModel] = OrderHistoryInput

    def _run(self, user_id: str, limit: int = 10) -> str:
        try:
            url = f"{BACKEND_URL}/api/orders/user/{user_id}"
            params = {"limit": limit}

            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            orders = response.json()

            if not orders:
                return f"No order history found for user {user_id}."

            result = f"Order History (last {limit} orders):\n"
            for order in orders[:limit]:
                result += (
                    f"\n- Order #{order.get('id', 'N/A')} | "
                    f"Date: {order.get('createdAt', 'N/A')} | "
                    f"Total: {order.get('totalPrice', 'N/A')} TL | "
                    f"Status: {order.get('status', 'N/A')}\n"
                )
                items = order.get("items", [])
                for item in items:
                    result += (
                        f"  • {item.get('name', 'Unknown')} x{item.get('quantity', 1)} "
                        f"({item.get('price', 'N/A')} TL)\n"
                    )
            return result

        except requests.RequestException as e:
            print(f"❌ OrderHistoryTool hatası: {e}")
            return f"Error fetching order history: {str(e)}"


# ============================================================
# Tool 3: Campaign Creator Tool
# ============================================================
class CampaignCreatorInput(BaseModel):
    """Input schema for CampaignCreatorTool."""
    cafe_id: str = Field(
        description="The ID of the cafe to create campaign for."
    )
    campaign_name: str = Field(
        description="Name of the campaign."
    )
    description: str = Field(
        description="Campaign description/message for users."
    )
    discount_percentage: float = Field(
        description="Discount percentage (e.g., 20 for 20% off)."
    )
    target_products: str = Field(
        description="Comma-separated list of product IDs to include in the campaign."
    )


class CampaignCreatorTool(BaseTool):
    name: str = "campaign_creator"
    description: str = (
        "Creates a new promotional campaign for a cafe. "
        "Can set up flash sales, combo deals, or loyalty bonuses "
        "with specific discount percentages for target products."
    )
    args_schema: Type[BaseModel] = CampaignCreatorInput

    def _run(
        self,
        cafe_id: str,
        campaign_name: str,
        description: str,
        discount_percentage: float,
        target_products: str,
    ) -> str:
        try:
            url = f"{BACKEND_URL}/api/campaigns"
            payload = {
                "cafeId": cafe_id,
                "name": campaign_name,
                "description": description,
                "discountPercentage": discount_percentage,
                "productIds": [pid.strip() for pid in target_products.split(",")],
                "isActive": True,
            }

            response = requests.post(url, json=payload, timeout=10)
            response.raise_for_status()
            campaign = response.json()

            return (
                f"Campaign created successfully!\n"
                f"- Name: {campaign.get('name', campaign_name)}\n"
                f"- Discount: {discount_percentage}%\n"
                f"- Status: Active\n"
                f"- ID: {campaign.get('id', 'N/A')}"
            )

        except requests.RequestException as e:
            print(f"❌ CampaignCreatorTool hatası: {e}")
            return f"Error creating campaign: {str(e)}"


# ============================================================
# Tool 4: Inventory Checker Tool
# ============================================================
class InventoryCheckerInput(BaseModel):
    """Input schema for InventoryCheckerTool."""
    cafe_id: str = Field(
        description="The ID of the cafe to check inventory for."
    )


class InventoryCheckerTool(BaseTool):
    name: str = "inventory_checker"
    description: str = (
        "Checks the current inventory levels and sales data for a cafe. "
        "Returns stock levels, daily sales counts, and identifies "
        "items that may need restocking or are at risk of waste."
    )
    args_schema: Type[BaseModel] = InventoryCheckerInput

    def _run(self, cafe_id: str) -> str:
        try:
            # Fetch products for the cafe
            url = f"{BACKEND_URL}/api/products"
            params = {"cafe_id": cafe_id}
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            products = response.json()

            # Fetch recent orders for trend analysis
            orders_url = f"{BACKEND_URL}/api/orders/cafe/{cafe_id}"
            orders_response = requests.get(orders_url, timeout=10)
            orders = orders_response.json() if orders_response.ok else []

            result = f"Inventory Report for Cafe {cafe_id}:\n\n"
            result += "Products:\n"
            for p in products:
                status = "✅ Available" if p.get("isAvailable", True) else "❌ Unavailable"
                result += (
                    f"- {p.get('name', 'Unknown')} | "
                    f"Price: {p.get('price', 'N/A')} TL | "
                    f"Status: {status}\n"
                )

            result += f"\nRecent Orders Count: {len(orders)}\n"

            if orders:
                # Simple sales analysis
                item_counts = {}
                for order in orders:
                    for item in order.get("items", []):
                        name = item.get("name", "Unknown")
                        item_counts[name] = item_counts.get(name, 0) + item.get("quantity", 1)

                result += "\nTop Selling Items:\n"
                sorted_items = sorted(item_counts.items(), key=lambda x: x[1], reverse=True)
                for name, count in sorted_items[:5]:
                    result += f"- {name}: {count} units sold\n"

            return result

        except requests.RequestException as e:
            print(f"❌ InventoryCheckerTool hatası: {e}")
            return f"Error checking inventory: {str(e)}"
