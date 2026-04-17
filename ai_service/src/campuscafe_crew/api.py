"""
FastAPI Entry Point for CampusCafe AI Crew.
Exposes the multi-agent system via HTTP endpoints.
"""

import os
from datetime import datetime
from typing import Optional, Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load env variables
load_dotenv()

from campuscafe_crew.crew import CampusCafeCrew
from campuscafe_crew.graph import campus_app
from langchain_core.messages import HumanMessage

app = FastAPI(
    title="CampusCafe AI API",
    description="API Gateway for the CampusCafe CrewAI Multi-Agent System",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Request Schemas ---

class MealRecommendationRequest(BaseModel):
    budget: str
    dietary_preferences: Optional[str] = "none"


class PreOrderPredictionRequest(BaseModel):
    user_id: str
    cafe_id: str


class InventoryMonitorRequest(BaseModel):
    cafe_id: str


class GraphChatRequest(BaseModel):
    message: str


# --- Endpoints ---

@app.get("/")
async def root():
    return {"status": "online", "message": "CampusCafe AI API is running"}

@app.get("/ping")
async def ping():
    return {"message": "pong"}

@app.post("/graph")
@app.post("/api/graph")
async def chat_with_graph(request: GraphChatRequest):
    """LangGraph tabanlı akıllı asistan ile görüşme.

    LangSmith tracing otomatik olarak aktiftir (.env üzerinden LANGCHAIN_TRACING_V2=true).
    Her çağrı https://smith.langchain.com → 'campuscafe-ai' projesinde izlenebilir.
    """
    try:
        print(f"🤖 LangGraph'a mesaj geldi: {request.message}")
        initial_state = {
            "messages": [HumanMessage(content=request.message)],
            "next_step": "n/a",
            "final_response": "Henüz yanıtlanmadı"
        }
        result = campus_app.invoke(initial_state)
        return {
            "response": result.get("final_response", "Yanıt oluşturulamadı"),
            "path_taken": result.get("next_step", "unknown")
        }
    except Exception as e:
        print(f"❌ LangGraph Hatası: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat/recommend")
async def recommend_meal(request: MealRecommendationRequest):
    """Get personalized meal recommendations."""
    try:
        inputs = {
            "budget": request.budget,
            "dietary_preferences": request.dietary_preferences,
            "time_of_day": datetime.now().strftime("%H:%M"),
        }
        result = CampusCafeCrew().recommendation_crew().kickoff(inputs=inputs)
        return {"response": str(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat/preorder")
async def predict_preorder(request: PreOrderPredictionRequest):
    """Predict and suggest pre-orders."""
    try:
        inputs = {
            "user_id": request.user_id,
            "cafe_id": request.cafe_id,
            "current_time": datetime.now().isoformat(),
        }
        result = CampusCafeCrew().preorder_crew().kickoff(inputs=inputs)
        return {"response": str(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat/inventory")
async def monitor_inventory(request: InventoryMonitorRequest):
    """Get inventory insights (for cafe owners)."""
    try:
        inputs = {
            "cafe_id": request.cafe_id,
        }
        result = CampusCafeCrew().inventory_crew().kickoff(inputs=inputs)
        return {"response": str(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat/campaign")
async def create_campaign(request: InventoryMonitorRequest):
    """Suggest new campaigns (for cafe owners)."""
    try:
        inputs = {
            "cafe_id": request.cafe_id,
        }
        result = CampusCafeCrew().campaign_crew().kickoff(inputs=inputs)
        return {"response": str(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
