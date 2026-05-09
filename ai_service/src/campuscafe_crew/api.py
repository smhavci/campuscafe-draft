"""
FastAPI Entry Point for CampusCafe AI Crew.
Exposes the multi-agent system via HTTP endpoints.
"""

import os
import uuid
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
    user_id: Optional[str] = None
    auth_token: Optional[str] = None
    role: Optional[str] = "customer"     # customer | owner
    cafe_id: Optional[str] = None
    thread_id: Optional[str] = None      # Konuşma ID — aynı ID ile gelen mesajlar önceki bağlamı hatırlar


class CampaignResumeRequest(BaseModel):
    thread_id: str                        # Duraklatılmış konuşmanın ID'si
    decision: str                         # "evet" / "hayır" / "approved" / "rejected"


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
        # thread_id yoksa yeni oluştur — frontend bunu saklayıp sonraki mesajda geri gönderir
        thread_id = request.thread_id or str(uuid.uuid4())
        config = {"configurable": {"thread_id": thread_id}}

        print(f"🤖 [{thread_id[:8]}] LangGraph'a mesaj geldi: {request.message}")

        initial_state = {
            "messages":        [HumanMessage(content=request.message)],
            "intent":          "",
            "final_response":  "",
            "user_id":         request.user_id,
            "auth_token":      request.auth_token,
            "user_context":    None,
            "extracted_params": {"cafe_id": request.cafe_id},
            "role":            request.role or "customer",
            "error":           None,
            "campaign_proposal": None,
            "approval_decision": None,
            "retry_count":     0,
            "critic_feedback": None,
        }
        result = await campus_app.ainvoke(initial_state, config=config)

        # Kampanya akışında graph campaign_executor'dan önce duraklar.
        # Bu durumda final_response boştur ama campaign_proposal dolmuştur.
        proposal = result.get("campaign_proposal")
        final = result.get("final_response", "")
        if proposal and not final:
            print(f"⏸️  [{thread_id[:8]}] Kampanya onayı bekleniyor")
            return {
                "status": "awaiting_approval",
                "campaign_proposal": proposal,
                "thread_id": thread_id,
                "intent": result.get("intent", "campaign"),
            }

        if result.get("error"):
            print(f"⚠️  State'te hata var: {result['error']}")

        return {
            "status":    "completed",
            "response":  final or "Yanıt oluşturulamadı",
            "intent":    result.get("intent", "unknown"),
            "thread_id": thread_id,
        }
    except Exception as e:
        print(f"❌ LangGraph Hatası: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/graph/resume")
@app.post("/api/graph/resume")
async def resume_campaign(request: CampaignResumeRequest):
    """Duraklatılmış kampanya akışını sahip kararıyla devam ettirir.

    status=awaiting_approval döndüren bir /graph çağrısından sonra çağrılır.
    decision: "evet" onaylar, "hayır" iptal eder.
    """
    try:
        config = {"configurable": {"thread_id": request.thread_id}}
        print(f"▶️  [{request.thread_id[:8]}] Kampanya kararı: {request.decision}")

        # State'e kararı yaz, ardından graph'ı kaldığı yerden devam ettir
        # messages=[] geçmek add_messages reducer'ının None ile çökmesini önler
        campus_app.update_state(config, {"approval_decision": request.decision})
        result = await campus_app.ainvoke({"messages": []}, config=config)

        return {
            "status": "completed",
            "response": result.get("final_response", "Yanıt oluşturulamadı"),
            "thread_id": request.thread_id,
            "intent": result.get("intent", "campaign"),
        }
    except Exception as e:
        print(f"❌ Resume Hatası: {str(e)}")
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
