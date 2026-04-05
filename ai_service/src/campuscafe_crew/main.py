#!/usr/bin/env python3
"""
CampusCafe AI Crew - Main Entry Point.
Run different crew tasks based on the selected mode.
"""

import sys
import os
from datetime import datetime

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from campuscafe_crew.crew import CampusCafeCrew


def run_meal_recommendation():
    """Run the meal recommendation task."""
    inputs = {
        "budget": input("Enter your budget (TL): ") or "100",
        "dietary_preferences": input("Dietary preferences (e.g., vegetarian, none): ") or "none",
        "time_of_day": datetime.now().strftime("%H:%M"),
    }

    print("\n🍽️  Finding the best meal options for you...\n")
    result = CampusCafeCrew().recommendation_crew().kickoff(inputs=inputs)
    print("\n" + "=" * 50)
    print("📋 Recommendation Result:")
    print("=" * 50)
    print(result)


def run_preorder_prediction():
    """Run the pre-order prediction task."""
    inputs = {
        "user_id": input("Enter user ID: "),
        "cafe_id": input("Enter cafe ID: "),
        "current_time": datetime.now().isoformat(),
    }

    print("\n⏰ Analyzing your ordering patterns...\n")
    result = CampusCafeCrew().preorder_crew().kickoff(inputs=inputs)
    print("\n" + "=" * 50)
    print("📋 Pre-Order Suggestion:")
    print("=" * 50)
    print(result)


def run_inventory_monitor():
    """Run the inventory monitoring task."""
    inputs = {
        "cafe_id": input("Enter cafe ID: "),
    }

    print("\n📊 Monitoring inventory and trends...\n")
    result = CampusCafeCrew().inventory_crew().kickoff(inputs=inputs)
    print("\n" + "=" * 50)
    print("📋 Inventory Report:")
    print("=" * 50)
    print(result)


def run_campaign_creator():
    """Run the campaign creation task."""
    inputs = {
        "cafe_id": input("Enter cafe ID: "),
    }

    print("\n🎯 Analyzing sales data and creating campaign...\n")
    result = CampusCafeCrew().campaign_crew().kickoff(inputs=inputs)
    print("\n" + "=" * 50)
    print("📋 Campaign Proposal:")
    print("=" * 50)
    print(result)


def main():
    """Main entry point with mode selection."""
    print("=" * 50)
    print("🎓 CampusCafe AI Assistant")
    print("=" * 50)
    print("\nSelect a mode:")
    print("1. 🍽️  Meal Recommendation (Budget & Health)")
    print("2. ⏰  Pre-Order Prediction")
    print("3. 📊  Inventory & Trend Monitor")
    print("4. 🎯  Campaign Creator")
    print("0. ❌  Exit")
    print()

    choice = input("Enter your choice (0-4): ").strip()

    if choice == "1":
        run_meal_recommendation()
    elif choice == "2":
        run_preorder_prediction()
    elif choice == "3":
        run_inventory_monitor()
    elif choice == "4":
        run_campaign_creator()
    elif choice == "0":
        print("Goodbye! 👋")
        sys.exit(0)
    else:
        print("Invalid choice. Please try again.")
        main()


if __name__ == "__main__":
    main()
