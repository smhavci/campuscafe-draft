import os
import json
import requests
from typing import TypedDict, List, Optional, Dict, Any, Annotated
from datetime import datetime

from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langgraph.graph.message import add_messages
from campuscafe_crew.crew import CampusCafeCrew


class GraphState(TypedDict):
    # add_messages reducer: her yeni mesaj listeye eklenir, üzerine yazılmaz
    messages: Annotated[List[BaseMessage], add_messages]
    intent: str                              # recommendation | preorder | inventory | campaign | general
    final_response: str
    user_id: Optional[str]
    auth_token: Optional[str]
    user_context: Optional[str]
    extracted_params: Optional[Dict[str, Any]]  # budget, dietary_preferences, cafe_id
    role: Optional[str]                      # customer | owner
    error: Optional[str]
    # Human-in-the-Loop: kampanya onay akışı
    campaign_proposal: Optional[str]         # Sahibe sunulan öneri metni
    approval_decision: Optional[str]         # "approved" | "rejected"
    # Reflection Loop: öneri kalite kontrolü
    retry_count: Optional[int]               # Kaç kez yeniden denendi (maks 2)
    critic_feedback: Optional[str]           # Critic'ten gelen geri bildirim


# ─────────────────────────────────────────────────────────
# Yardımcı: Konuşma geçmişini okunabilir metne çevir
# ─────────────────────────────────────────────────────────
def _format_conversation(messages: list, max_turns: int = 4) -> str:
    recent = messages[-max_turns * 2:]
    lines = []
    for m in recent:
        role = "Kullanıcı" if isinstance(m, HumanMessage) else "Asistan"
        lines.append(f"{role}: {m.content}")
    return "\n".join(lines)


# ─────────────────────────────────────────────────────────
# Yardımcı: Sipariş geçmişini özetle
# ─────────────────────────────────────────────────────────
def _summarize_orders(orders: list) -> str:
    if not orders:
        return "Kullanıcının daha önce siparişi yok."

    product_counts: dict[str, int] = {}
    for order in orders[:10]:
        for item in order.get("items", []):
            name = item.get("productName", "Bilinmeyen")
            qty = item.get("quantity", 1)
            product_counts[name] = product_counts.get(name, 0) + qty

    sorted_products = sorted(product_counts.items(), key=lambda x: x[1], reverse=True)
    lines = [f"Toplam incelenen sipariş: {len(orders)}", "En çok sipariş edilen ürünler:"]
    for name, count in sorted_products[:5]:
        lines.append(f"  - {name}: {count} kez")

    total_spent = sum(o.get("totalAmount", 0) for o in orders)
    avg_spent = total_spent / len(orders) if orders else 0
    lines.append(f"Ortalama sipariş tutarı: {avg_spent:.0f} TL")
    return "\n".join(lines)


# ─────────────────────────────────────────────────────────
# Node 1: Intent Classifier
# ─────────────────────────────────────────────────────────
def intent_classifier_node(state: GraphState) -> dict:
    """Konuşma geçmişini göz önünde bulundurarak isteği kategorize eder."""
    msgs = state.get("messages") or []
    last_msg = msgs[-1].content if msgs else ""
    print(f"\n{'='*60}")
    print(f"[LangGraph] ▶ intent_classifier")
    print(f"[LangGraph]   Mesaj: {last_msg[:80]}")
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    role = state.get("role") or "customer"

    # Son mesajın yanı sıra önceki konuşmayı da ver — bağlamdan yönlendirme yap
    conversation = _format_conversation(state["messages"], max_turns=3)

    prompt = f"""Sen CampusCafe'nin akıllı yönlendiricisisin. Kullanıcı rolü: {role}

Aşağıdaki konuşmayı okuyarak SON kullanıcı mesajını kategorize et:
- recommendation: Yemek önerisi, bütçeye göre seçim, ne yiyeyim soruları
- preorder: Ön sipariş, sırayı atlatma, önceden sipariş
- inventory: Stok kontrolü, ürün durumu, satış analizi (sadece cafe sahibi)
- campaign: Kampanya oluşturma, flash sale, indirim önerisi (sadece cafe sahibi)
- general: Selamlama, sistem soruları, genel sohbet, önceki öneriye yorum

Sadece kategori adını döndür (küçük harf), başka hiçbir şey yazma.

Konuşma:
{conversation}"""

    response = llm.invoke(prompt).content.strip().lower()
    valid = {"recommendation", "preorder", "inventory", "campaign", "general"}

    if role == "customer" and response in {"inventory", "campaign"}:
        response = "general"

    intent = response if response in valid else "general"
    print(f"[LangGraph]   Intent → {intent.upper()}")
    return {"intent": intent}


# ─────────────────────────────────────────────────────────
# Node 2: Parameter Extractor
# ─────────────────────────────────────────────────────────
def param_extractor_node(state: GraphState) -> dict:
    """Tüm konuşma geçmişinden parametreleri biriktirir — önceki turlar geçerlidir."""
    print(f"[LangGraph] ▶ param_extractor")
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

    # Tüm konuşmayı ver: kullanıcı "vejetaryen olsun" dese önceki "200 TL" hâlâ geçerli
    conversation = _format_conversation(state["messages"], max_turns=6)

    # Önceki turdan gelen parametreler varsa onları da bağlam olarak ver
    prev = state.get("extracted_params") or {}

    prompt = f"""Konuşma geçmişinden parametreleri çıkar. Önceki mesajlarda verilen bilgiler hâlâ geçerlidir; yeni mesaj onları güncelleyebilir veya ekleyebilir.

Parametreler:
- budget: Sayısal bütçe TL (sadece sayı, örn: 150). Konuşmada hiç belirtilmediyse null.
- dietary_preferences: Diyet kısıtı (örn: "vejetaryen", "vegan", "glutensiz"). Yoksa null.
- cafe_id: Belirtilen kafe ID. Yoksa null.

Önceki tur parametreleri (güncellenmezse bunları koru):
{json.dumps(prev, ensure_ascii=False)}

Konuşma:
{conversation}

Sadece JSON döndür: {{"budget": ..., "dietary_preferences": ..., "cafe_id": ...}}"""

    try:
        raw = llm.invoke(prompt).content.strip()
        if "```" in raw:
            raw = raw.split("```")[1].replace("json", "").strip()
        params = json.loads(raw)
    except Exception as e:
        print(f"⚠️  Parametre çıkarma hatası: {type(e).__name__}: {e}")
        params = prev or {"budget": None, "dietary_preferences": None, "cafe_id": None}

    print(f"[LangGraph]   Parametreler → {params}")
    return {"extracted_params": params}


# ─────────────────────────────────────────────────────────
# Node 3: User Context
# ─────────────────────────────────────────────────────────
def user_context_node(state: GraphState) -> dict:
    """Kullanıcının sipariş geçmişini backend'den çeker."""
    print(f"[LangGraph] ▶ user_context  (sipariş geçmişi çekiliyor)")
    user_id = state.get("user_id")
    auth_token = state.get("auth_token")

    if not user_id or not auth_token:
        return {"user_context": "Kullanıcı giriş yapmamış, kişisel geçmiş bilgisi yok."}

    backend_url = os.getenv("BACKEND_URL", "http://localhost:3000")
    try:
        response = requests.get(
            f"{backend_url}/api/orders",
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=5,
        )
        summary = _summarize_orders(response.json()) if response.ok else "Sipariş geçmişi alınamadı."
    except Exception as e:
        print(f"⚠️  Kullanıcı geçmişi çekme hatası: {type(e).__name__}: {e}")
        summary = "Sipariş geçmişi alınamadı (bağlantı hatası)."

    return {"user_context": summary}


# ─────────────────────────────────────────────────────────
# MCP Yardımcısı: Hava Durumu
# ─────────────────────────────────────────────────────────
async def _get_weather_from_mcp() -> str:
    """MCP server'dan anlık hava durumu çeker.
    Server çalışmıyorsa sessizce fallback döner — sistemi bozmaz.
    """
    mcp_url = os.getenv("MCP_SERVER_URL", "http://localhost:8001/sse")
    city = os.getenv("CAMPUS_CITY", "Ankara")
    try:
        from langchain_mcp_adapters.client import MultiServerMCPClient
        client = MultiServerMCPClient({"weather": {"url": mcp_url, "transport": "sse"}})
        tools = await client.get_tools()
        weather_tool = next((t for t in tools if t.name == "get_current_weather"), None)
        if not weather_tool:
            print("⚠️  MCP: get_current_weather aracı bulunamadı")
            return ""
        result = await weather_tool.ainvoke({"city": city})
        weather_str = str(result)
        print(f"🌤️  MCP hava durumu: {weather_str}")
        return weather_str
    except Exception as e:
        print(f"⚠️  MCP bağlantısı kurulamadı ({e}) — hava durumu olmadan devam")
        return ""


# ─────────────────────────────────────────────────────────
# Node 4: Recommendation Handler
# ─────────────────────────────────────────────────────────
async def recommendation_node(state: GraphState) -> dict:
    """Öneri üretir — hava durumu MCP'den, menü CrewAI'dan gelir."""
    print(f"[LangGraph] ▶ recommendation_handler  (CrewAI + MCP devreye giriyor)")
    try:
        params = state.get("extracted_params") or {}

        msgs = state.get("messages") or []
        user_input = msgs[-1].content if msgs else ""
        feedback = state.get("critic_feedback")
        if feedback:
            user_input += f"\n\n[Önceki öneri yetersizdi. Lütfen şunu düzelt: {feedback}]"

        # MCP'den hava durumu al — server yoksa boş string döner, sistem çalışmaya devam eder
        weather_context = await _get_weather_from_mcp()

        crew = CampusCafeCrew().recommendation_crew()
        result = crew.kickoff(inputs={
            "budget": str(params.get("budget") or "belirtilmemiş"),
            "dietary_preferences": params.get("dietary_preferences") or "yok",
            "time_of_day": datetime.now().strftime("%H:%M"),
            "user_history": state.get("user_context") or "Geçmiş sipariş bilgisi yok.",
            "user_input": user_input,
            "weather_context": weather_context or "Hava durumu bilgisi mevcut değil.",
        })
        response_text = str(result)
        return {
            "final_response": response_text,
            "messages": [AIMessage(content=response_text)],
            "error": None,
        }
    except Exception as e:
        print(f"❌ Recommendation hatası: {type(e).__name__}: {e}")
        msg = "Öneri alınırken bir hata oluştu. Lütfen tekrar deneyin."
        return {"final_response": msg, "messages": [AIMessage(content=msg)], "error": str(e)}


# ─────────────────────────────────────────────────────────
# Node 5: Pre-Order Handler
# ─────────────────────────────────────────────────────────
def preorder_node(state: GraphState) -> dict:
    """Sipariş geçmişine göre ön sipariş tahmini yapar."""
    print(f"[LangGraph] ▶ preorder_handler  (CrewAI → preorder_predictor agent)")
    try:
        params = state.get("extracted_params") or {}
        crew = CampusCafeCrew().preorder_crew()
        result = crew.kickoff(inputs={
            "user_id": state.get("user_id") or "bilinmiyor",
            "cafe_id": params.get("cafe_id") or "genel",
            "current_time": datetime.now().isoformat(),
            "user_history": state.get("user_context") or "Geçmiş sipariş bilgisi yok.",
        })
        response_text = str(result)
        return {
            "final_response": response_text,
            "messages": [AIMessage(content=response_text)],
            "error": None,
        }
    except Exception as e:
        print(f"❌ Preorder hatası: {type(e).__name__}: {e}")
        msg = "Ön sipariş önerisi oluşturulurken hata oluştu. Lütfen tekrar deneyin."
        return {"final_response": msg, "messages": [AIMessage(content=msg)], "error": str(e)}


# ─────────────────────────────────────────────────────────
# Node 6: Inventory Handler (Cafe Sahibi)
# ─────────────────────────────────────────────────────────
def inventory_node(state: GraphState) -> dict:
    """Stok ve satış trendlerini analiz eder."""
    print(f"[LangGraph] ▶ inventory_handler  (CrewAI → inventory_trend_monitor agent)")
    try:
        params = state.get("extracted_params") or {}
        cafe_id = params.get("cafe_id") or state.get("user_id") or "1"
        crew = CampusCafeCrew().inventory_crew()
        result = crew.kickoff(inputs={"cafe_id": cafe_id})
        response_text = str(result)
        return {
            "final_response": response_text,
            "messages": [AIMessage(content=response_text)],
            "error": None,
        }
    except Exception as e:
        print(f"❌ Inventory hatası: {type(e).__name__}: {e}")
        msg = "Stok analizi sırasında hata oluştu. Lütfen tekrar deneyin."
        return {"final_response": msg, "messages": [AIMessage(content=msg)], "error": str(e)}


# ─────────────────────────────────────────────────────────
# Node 7a: Campaign Proposal (Cafe Sahibi) — Human-in-the-Loop: 1. adım
# ─────────────────────────────────────────────────────────
def campaign_proposal_node(state: GraphState) -> dict:
    """Stok verilerini analiz ederek kampanya önerisi oluşturur — kampanyayı henüz OLUŞTURMAZ.
    Graph bu node'dan sonra durur ve sahibin onayını bekler (interrupt_before=campaign_executor).
    """
    print(f"[LangGraph] ▶ campaign_proposal  (Human-in-the-Loop → sahip onayı bekleniyor)")
    llm = ChatOpenAI(model="gpt-4o-mini")
    params = state.get("extracted_params") or {}
    cafe_id = params.get("cafe_id") or state.get("user_id") or "1"

    # Stok ve ürün verilerini backend'den çek
    backend_url = os.getenv("BACKEND_URL", "http://localhost:3000")
    try:
        products_resp = requests.get(
            f"{backend_url}/api/products", params={"cafe_id": cafe_id}, timeout=5
        )
        products = products_resp.json() if products_resp.ok else []
    except Exception as e:
        print(f"⚠️  Ürün verisi çekme hatası: {type(e).__name__}: {e}")
        products = []

    products_text = "\n".join([
        f"- {p.get('name', 'Bilinmeyen')}: {p.get('price', '?')} TL, "
        f"{'mevcut' if p.get('isAvailable', True) else 'tükendi'}"
        for p in products[:10]
    ]) or "Ürün verisi alınamadı."

    prompt = f"""Sen CampusCafe'nin kampanya danışmanısın. Aşağıdaki ürün listesini inceleyerek somut bir flash sale kampanyası öner.

Ürünler (Kafe ID: {cafe_id}):
{products_text}

Kısa ve net bir kampanya önerisi hazırla (4-5 cümle):
- Hangi ürünler kampanyaya dahil olacak
- Kaç % indirim önerildiği
- Kampanya süresi (örn: bugün 14:00-18:00)
- Beklenen fayda (israf azaltma / satış artışı)

Son cümle mutlaka şu şekilde bitsin: "Bu kampanyayı onaylıyor musunuz? (evet / hayır)" """

    try:
        proposal = llm.invoke(prompt).content
    except Exception as e:
        print(f"⚠️  Kampanya önerisi üretme hatası: {type(e).__name__}: {e}")
        proposal = (
            f"Kafe {cafe_id} için stok analizi tamamlandı. "
            "Yavaş satan ürünlere %20 indirimli flash sale önerilmektedir (bugün 15:00-18:00). "
            "Bu kampanyayı onaylıyor musunuz? (evet / hayır)"
        )

    return {"campaign_proposal": proposal}


# ─────────────────────────────────────────────────────────
# Node 7b: Campaign Executor (Cafe Sahibi) — Human-in-the-Loop: 2. adım
# ─────────────────────────────────────────────────────────
def campaign_executor_node(state: GraphState) -> dict:
    """Sahibin kararına göre kampanyayı oluşturur veya iptal eder.

    Onay gelirse proposal metninden LLM ile yapılandırılmış veri çıkarır,
    doğrudan backend'e kaydeder — yeni CrewAI crew başlatmaz.
    """
    decision = (state.get("approval_decision") or "").strip().lower()
    approved = decision in {"approved", "evet", "yes", "onay", "onayla"}

    print(f"[LangGraph] ▶ campaign_executor — karar: '{decision}', onaylandı: {approved}")

    if not approved:
        msg = "Kampanya iptal edildi. İstediğinizde yeni bir öneri oluşturabilirim."
        return {"final_response": msg, "messages": [AIMessage(content=msg)], "error": None}

    try:
        params   = state.get("extracted_params") or {}
        cafe_id  = params.get("cafe_id") or state.get("user_id") or "1"
        proposal = state.get("campaign_proposal") or ""
        backend_url = os.getenv("BACKEND_URL", "http://localhost:3000")

        print(f"[LangGraph]   Proposal'dan kampanya detayları çıkarılıyor...")

        # Proposal metninden yapılandırılmış veri çıkar — yeni crew başlatmadan
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
        extract_prompt = f"""Aşağıdaki kampanya önerisinden bilgileri JSON olarak çıkar.

Öneri metni:
{proposal}

Şu JSON formatında döndür (başka hiçbir şey yazma):
{{"name": "kampanya adı (kısa, max 50 karakter)", "description": "açıklama (max 150 karakter)", "discountPercentage": 20}}

discountPercentage metinde belirtilen yüzde değeri olsun. Belirtilmemişse 15 kullan."""

        raw = llm.invoke(extract_prompt).content.strip()
        if "```" in raw:
            raw = raw.split("```")[1].replace("json", "").strip()

        campaign_data = json.loads(raw)
        print(f"[LangGraph]   Çıkarılan veriler: {campaign_data}")

        # Kampanyayı doğrudan backend'e kaydet
        payload = {
            "cafeId":             cafe_id,
            "name":               campaign_data.get("name", "Flash Sale"),
            "description":        campaign_data.get("description", proposal[:150]),
            "discountPercentage": campaign_data.get("discountPercentage", 15),
            "productIds":         [],
            "isActive":           True,
        }
        resp = requests.post(f"{backend_url}/api/campaigns", json=payload, timeout=10)
        resp.raise_for_status()
        saved = resp.json()

        print(f"[LangGraph]   ✅ Kampanya DB'ye kaydedildi — ID: {saved.get('id', '?')}")

        msg = (
            f"Kampanya başarıyla oluşturuldu ve yayınlandı!\n\n"
            f"**{payload['name']}**\n"
            f"{payload['description']}\n\n"
            f"İndirim: %{payload['discountPercentage']} | Durum: Aktif"
        )
        return {"final_response": msg, "messages": [AIMessage(content=msg)], "error": None}

    except Exception as e:
        print(f"[LangGraph]   ❌ Campaign executor hatası: {type(e).__name__}: {e}")
        msg = "Kampanya oluşturulurken hata oluştu. Lütfen tekrar deneyin."
        return {"final_response": msg, "messages": [AIMessage(content=msg)], "error": str(e)}


# ─────────────────────────────────────────────────────────
# Node 8: Critic — Öneri Kalite Kontrolü (Reflection Loop)
# ─────────────────────────────────────────────────────────
def critic_node(state: GraphState) -> dict:
    """Üretilen öneriyi bütçe ve içerik açısından değerlendirir."""
    print(f"[LangGraph] ▶ critic  (oneri kalite kontrolu — retry: {state.get('retry_count', 0)})")
    retry_count = state.get("retry_count") or 0

    # Maksimum deneme aşıldıysa zorla kabul et — sonsuz döngüyü önle
    if retry_count >= 2:
        return {"critic_feedback": None}

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    response = state.get("final_response", "")
    params = state.get("extracted_params") or {}
    budget = params.get("budget")
    dietary = params.get("dietary_preferences")

    budget_line = f"Bütçe: {budget} TL" if budget else "Bütçe: belirtilmemiş"
    dietary_line = f"Diyet kısıtı: {dietary}" if dietary else "Diyet kısıtı: yok"

    prompt = f"""Sen CampusCafe öneri kalite kontrolcüsüsün. Aşağıdaki öneriyi değerlendir.

Kullanıcı kriterleri:
- {budget_line}
- {dietary_line}

Üretilen öneri:
{response}

Kontrol listesi:
1. Somut ürün isimleri ve fiyatlar var mı?
2. Bütçe belirtilmişse toplam fiyat bütçe içinde mi?
3. Diyet kısıtı belirtilmişse uygun mu?
4. Türkçe, anlaşılır ve kullanışlı mı?

Eğer öneri yeterliyse SADECE şunu yaz (başka hiçbir şey ekleme):
VALID

Eğer öneri geliştirilmesi gerekiyorsa şunu yaz:
INVALID: [kısa ve somut geri bildirim — ne eksik veya yanlış]"""

    result = llm.invoke(prompt).content.strip()

    if result.upper().startswith("VALID"):
        print(f"[LangGraph]   Critic → VALID ✅ (öneri kabul edildi)")
        return {"critic_feedback": None}

    feedback = result.replace("INVALID:", "").replace("INVALID", "").strip()
    print(f"[LangGraph]   Critic → INVALID ❌ (tekrar denenecek: {feedback[:60]})")
    return {
        "critic_feedback": feedback,
        "retry_count": retry_count + 1,
    }


# ─────────────────────────────────────────────────────────
# Node 9: General Handler
# ─────────────────────────────────────────────────────────
def general_node(state: GraphState) -> dict:
    """Genel sohbet ve sistem sorularını konuşma geçmişiyle yanıtlar."""
    print(f"[LangGraph] ▶ general_handler  (doğrudan LLM yanıtı)")
    llm = ChatOpenAI(model="gpt-4o-mini")
    try:
        system = "Sen CampusCafe'nin yardımcı asistanısın. Kısa ve samimi yanıt ver."
        msgs = state.get("messages") or []
        response = llm.invoke([
            {"role": "system", "content": system},
            *[
                {"role": "user" if isinstance(m, HumanMessage) else "assistant", "content": m.content}
                for m in msgs[-6:]
            ],
        ])
        response_text = response.content
        return {
            "final_response": response_text,
            "messages": [AIMessage(content=response_text)],
            "error": None,
        }
    except Exception as e:
        print(f"❌ General handler hatası: {type(e).__name__}: {e}")
        msg = "Şu anda yanıt veremiyorum. Lütfen tekrar deneyin."
        return {"final_response": msg, "messages": [AIMessage(content=msg)], "error": str(e)}
