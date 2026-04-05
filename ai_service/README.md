# CampusCafe AI Service

CrewAI powered multi-agent system for CampusCafe campus dining management.

## Agents

| Agent | Role | Tools |
|-------|------|-------|
| **Budget & Health Advisor** | Meal recommendation based on budget/diet | Menu Search |
| **Pre-Order Predictor** | Predicts ordering patterns, suggests pre-orders | Menu Search, Order History |
| **Inventory & Trend Monitor** | Monitors stock levels, detects trends | Inventory Checker |
| **Campaign Manager** | Creates promotional campaigns autonomously | Inventory Checker, Campaign Creator |

## Setup

```bash
# 1. Create virtual environment
python -m venv venv
source venv/bin/activate  # macOS/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# 4. Run the crew
cd src
python -m campuscafe_crew.main
```

## Project Structure

```
ai_service/
├── src/
│   └── campuscafe_crew/
│       ├── config/
│       │   ├── agents.yaml      # Agent definitions
│       │   └── tasks.yaml       # Task definitions
│       ├── tools/
│       │   ├── __init__.py
│       │   └── custom_tool.py   # Custom tools (API connectors)
│       ├── __init__.py
│       ├── crew.py              # Crew definition
│       └── main.py              # Entry point
├── .env                         # Environment variables
├── .env.example                 # Environment template
├── pyproject.toml               # Project configuration
├── requirements.txt             # Python dependencies
└── README.md                    # This file
```
