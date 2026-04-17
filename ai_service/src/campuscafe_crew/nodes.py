import os
import requests
from typing import TypedDict, List, Optional
from datetime import datetime

from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, HumanMessage
from campuscafe_crew.crew import CampusCafeCrew


class GraphState(TypedDict):
    """LangGraph durumunu temsil eden yapı."""
    messages: List[BaseMessage]
    next_step: str
    final_response: str
    user_id: Optional[str]
    auth_token: Optional[str]
    user_context: Optional[str]


# ─────────────────────────────────────────────────────────
# Yardımcı: Sipariş geçmişini okunabilir metne çevir
# ─────────────────────────────────────────────────────────
def _summarize_orders(orders: list) -> str:
    if not orders:
        return "Kullanıcının daha önce siparişi yok."

    lines = []
    product_counts: dict[str, int] = {}

    for order in orders[:10]:
        items = order.get("items", [])
        for item in items:
            name = item.get("productName", "Bilinmeyen")
            qty = item.get("quantity", 1)
            product_counts[name] = product_counts.get(name, 0) + qty

    sorted_products = sorted(product_counts.items(), key=lambda x: x[1], reverse=True)

    lines.append(f"Toplam incelenen sipariş: {len(orders)}")
    lines.append("En çok sipariş edilen ürünler:")
    for name, count in sorted_products[:5]:
        lines.append(f"  - {name}: {count} kez")

    total_spent = sum(o.get("totalAmount", 0) for o in orders)
    avg_spent = total_spent / len(orders) if orders else 0
    lines.append(f"Ortalama sipariş tutarı: {avg_spent:.0f} TL")

    return "\n".join(lines)


# ─────────────────────────────────────────────────────────
# Node 1: Router — İsteği kategorize et
# ─────────────────────────────────────────────────────────
def router_node(state: GraphState) -> dict:
    """Kullanıcı isteğinin türüne karar veren yönlendirici düğüm."""
    llm = ChatOpenAI(model="gpt-4o-mini")

    last_message = state["messages"][-1].content

    prompt = f"""
    Sen CampusCafe'in akıllı yönlendiricisisin.
    Aşağıdaki kullanıcı isteğini analiz et ve şu iki kategoriden birine ata:
    1. 'crewai': Eğer istek yemek tavsiyesi, bütçe planlaması, sipariş tahmini veya stok/kampanya ile ilgiliyse.
    2. 'general': Eğer istek selamlaşma, genel sohbet veya sistemle ilgili basit bir soruysa.

    Sadece kategoriyi (crewai veya general) döndür, başka hiçbir şey yazma.

    İstek: {last_message}
    """

    response = llm.invoke(prompt).content.strip().lower()
    next_step = response if response in ["crewai", "general"] else "general"

    return {"next_step": next_step}


# ─────────────────────────────────────────────────────────
# Node 2: User Context — Kullanıcı geçmişini backend'den çek
# ─────────────────────────────────────────────────────────
def user_context_node(state: GraphState) -> dict:
    """Kullanıcının sipariş geçmişini backend API'den çeker ve özetler."""
    user_id = state.get("user_id")
    auth_token = state.get("auth_token")

    if not user_id or not auth_token:
        return {"user_context": "Kullanıcı giriş yapmamış, kişisel geçmiş bilgisi yok."}

    backend_url = os.getenv("BACKEND_URL", "http://localhost:3000")
    headers = {"Authorization": f"Bearer {auth_token}"}

    try:
        response = requests.get(
            f"{backend_url}/api/orders",
            headers=headers,
            timeout=5
        )
        if response.ok:
            orders = response.json()
            summary = _summarize_orders(orders)
        else:
            summary = "Sipariş geçmişi alınamadı."
    except Exception:
        summary = "Sipariş geçmişi alınamadı (bağlantı hatası)."

    return {"user_context": summary}


# ─────────────────────────────────────────────────────────
# Node 3: CrewAI Handler — Kişiselleştirilmiş öneri
# ─────────────────────────────────────────────────────────
def crewai_node(state: GraphState) -> dict:
    """Karmaşık görevler için CrewAI ekiplerini çağıran düğüm."""
    last_message = state["messages"][-1].content
    user_context = state.get("user_context", "Geçmiş sipariş bilgisi yok.")

    crew = CampusCafeCrew().recommendation_crew()
    result = crew.kickoff(inputs={
        "budget": "orta",
        "dietary_preferences": "yok",
        "time_of_day": datetime.now().strftime("%H:%M"),
        "user_history": user_context,
        "user_input": last_message,
    })

    return {"final_response": str(result)}


# ─────────────────────────────────────────────────────────
# Node 4: General Handler — Genel sohbet
# ─────────────────────────────────────────────────────────
def general_node(state: GraphState) -> dict:
    """Genel sohbet isteklerini yanıtlayan düğüm."""
    llm = ChatOpenAI(model="gpt-4o-mini")
    last_message = state["messages"][-1].content
    response = llm.invoke(
        f"Sen CampusCafe'nin yardımcı asistanısın. Kısa ve samimi yanıt ver: {last_message}"
    )
    return {"final_response": response.content}
