# CampusCafe AI — LangGraph Uygulama Raporu

**Proje:** CampusCafe  
**GitHub:** https://github.com/smhavci/campuscafe-draft  
**Tarih:** Nisan 2026  
**Teknolojiler:** LangGraph · CrewAI · FastAPI · Angular · Node.js

---

## 1. Proje Genel Bakış

CampusCafe, kampüs yemekhanesini dijitalleştiren bir sipariş ve yönetim platformudur. Öğrenciler menüyü görüntüleyip sipariş verebilir; kafe sahipleri siparişleri, kampanyaları ve stokları yönetebilir.

Bu rapor, projeye eklenen **LangGraph tabanlı AI katmanını** açıklamaktadır. LangGraph, mevcut CrewAI altyapısına eklenerek iki sistem birlikte çalışmaktadır.

---

## 2. LangGraph Nedir ve Neden Kullanıldı?

LangGraph, LangChain ekosisteminin bir parçası olan **çevrimli (cyclic) durum makinesi** kütüphanesidir. Klasik pipeline'lardan farkı:

| Özellik | Klasik Pipeline | LangGraph |
|---|---|---|
| Akış yönü | Tek yönlü (A→B→C) | Döngü desteği (A→B→A) |
| Durum yönetimi | Manuel | TypedDict state + reducer |
| Konuşma hafızası | Yok | Checkpointing (thread_id) |
| İnsan müdahalesi | Yok | `interrupt_before` ile durdur/devam |
| Hata yönetimi | Try/catch | State'e yazılır, koşullu yönlendirme |

**Projede LangGraph şu ihtiyaçları karşılamak için seçildi:**

1. Kullanıcı mesajını doğru AI yoluna yönlendirme (akıllı router)
2. Konuşma geçmişinin session boyunca korunması
3. Kampanya oluşturmadan önce kafe sahibinden onay alma
4. Öneri kalitesini otomatik denetleme ve gerektiğinde yeniden üretme

---

## 3. Mimari: LangGraph + CrewAI Birlikte

```
[Angular Frontend]
       │
       ▼  POST /api/ai/graph
[Node.js Backend — Proxy]
       │
       ▼  HTTP
[FastAPI (Python) — Port 8000]
       │
       ▼
[LangGraph State Machine]
   ┌───┴────────────────────────────────────────────┐
   │                                                │
   │  intent_classifier ──► param_extractor         │
   │         │                    │                 │
   │      general          user_context             │
   │         │              │        │              │
   │  general_handler  recommend  preorder          │
   │         │          handler   handler           │
   │         │              │        │              │
   │        END          critic ◄────┘              │
   │                   (döngü)                      │
   │                      │                         │
   │                campaign_proposal               │
   │                [INTERRUPT — onay]              │
   │                campaign_executor               │
   │                      │                         │
   │                inventory_handler               │
   └────────────────────────────────────────────────┘
                           │
                    [CrewAI Agents]
              ┌────────────┼────────────┐
        budget_health  preorder    inventory  campaign
          _advisor    _predictor   _monitor   _manager
```

**CrewAI ve LangGraph iş bölümü:**
- **LangGraph** → orchestration (yönlendirme, state yönetimi, döngü, onay akışı)
- **CrewAI** → execution (gerçek AI görevleri, tool kullanımı, agent reasoning)

---

## 4. GraphState — Merkezi Durum Yapısı

```python
class GraphState(TypedDict):
    messages:         Annotated[List[BaseMessage], add_messages]  # Birikimli konuşma
    intent:           str          # recommendation | preorder | inventory | campaign | general
    final_response:   str
    user_id:          Optional[str]
    auth_token:       Optional[str]
    user_context:     Optional[str]       # Sipariş geçmişi özeti
    extracted_params: Optional[Dict]      # budget, dietary_preferences, cafe_id
    role:             Optional[str]       # customer | owner
    error:            Optional[str]
    campaign_proposal: Optional[str]      # Sahibe sunulan öneri (Human-in-the-Loop)
    approval_decision: Optional[str]      # evet | hayır
    retry_count:      Optional[int]       # Reflection Loop sayacı (maks 2)
    critic_feedback:  Optional[str]       # Critic geri bildirimi
```

`messages` alanındaki `add_messages` reducer sayesinde her yeni mesaj listeye **eklenir** — üzerine yazılmaz. Bu, Persistence özelliğinin temelidir.

---

## 5. Graph Yapısı ve Node'lar

### 5.1 Node Listesi

| Node | Görev |
|---|---|
| `intent_classifier` | Mesajı 5 kategoriden birine atar |
| `param_extractor` | Bütçe, diyet, cafe_id'yi konuşmadan çıkarır |
| `user_context` | Backend'den sipariş geçmişini çeker |
| `recommendation_handler` | CrewAI `budget_health_advisor` çağırır |
| `critic` | Öneriyi değerlendirir, yetersizse geri döner |
| `preorder_handler` | CrewAI `preorder_predictor` çağırır |
| `inventory_handler` | CrewAI `inventory_trend_monitor` çağırır |
| `campaign_proposal` | Stok analizi yapıp öneri üretir (onay bekler) |
| `campaign_executor` | Onay sonrası kampanyayı oluşturur |
| `general_handler` | Genel sohbet yanıtlar |

### 5.2 Graf Kodu

```python
# graph.py
def create_campus_graph():
    workflow = StateGraph(GraphState)

    # Node'lar
    workflow.add_node("intent_classifier", intent_classifier_node)
    workflow.add_node("param_extractor",   param_extractor_node)
    workflow.add_node("user_context",      user_context_node)
    workflow.add_node("recommendation_handler", recommendation_node)
    workflow.add_node("critic",            critic_node)
    workflow.add_node("preorder_handler",  preorder_node)
    workflow.add_node("inventory_handler", inventory_node)
    workflow.add_node("campaign_proposal", campaign_proposal_node)
    workflow.add_node("campaign_executor", campaign_executor_node)
    workflow.add_node("general_handler",   general_node)

    # Adım 1: intent'e göre yönlendir
    workflow.add_conditional_edges("intent_classifier",
        lambda state: state["intent"],
        {"general": "general_handler",
         "recommendation": "param_extractor",
         "preorder": "param_extractor",
         "inventory": "param_extractor",
         "campaign": "param_extractor"})

    # Adım 2: müşteri → user_context, sahip → direkt handler
    workflow.add_conditional_edges("param_extractor",
        lambda state: state["intent"],
        {"recommendation": "user_context",
         "preorder": "user_context",
         "inventory": "inventory_handler",
         "campaign": "campaign_proposal"})

    # Adım 3: user_context → doğru handler
    workflow.add_conditional_edges("user_context",
        lambda state: state["intent"],
        {"recommendation": "recommendation_handler",
         "preorder": "preorder_handler"})

    # Reflection Loop
    workflow.add_edge("recommendation_handler", "critic")
    workflow.add_conditional_edges("critic",
        lambda state: "retry" if state.get("critic_feedback") else "end",
        {"retry": "recommendation_handler", "end": END})

    # Campaign chain
    workflow.add_edge("campaign_proposal", "campaign_executor")
    workflow.add_edge("campaign_executor", END)
    workflow.add_edge("preorder_handler", END)
    workflow.add_edge("inventory_handler", END)
    workflow.add_edge("general_handler", END)

    return workflow.compile(
        checkpointer=_checkpointer,                    # Persistence
        interrupt_before=["campaign_executor"]         # Human-in-the-Loop
    )
```

---

## 6. Özellik 1 — Persistence (Konuşma Hafızası)

### Ne Yapar?
Her kullanıcı konuşmasına benzersiz bir `thread_id` atanır. `MemorySaver` checkpointer sayesinde graph state her adımdan sonra kaydedilir. Aynı `thread_id` ile gelen yeni mesaj, **önceki tüm konuşmayı hatırlayarak** devam eder.

### Nasıl Çalışır?

```
Mesaj 1 (thread: abc): "Merhaba"
  → state kaydedilir: messages=[HumanMessage("Merhaba"), AIMessage("Merhaba!")]

Mesaj 2 (thread: abc): "200 TL bütçem var"
  → state yüklenir + yeni mesaj eklenir
  → param_extractor: budget=200 çıkarılır
  → state güncellenir

Mesaj 3 (thread: abc): "Vejetaryen olsun"
  → param_extractor TÜM konuşmayı okur
  → budget=200 + dietary=vejetaryen BİRLEŞTİRİLİR
  → öneri üretilir
```

### Teknik Detay

```python
# graph.py
_checkpointer = MemorySaver()  # Modül seviyesinde — tüm thread'ler buraya
campus_app = create_campus_graph()  # compile(checkpointer=_checkpointer)

# api.py
thread_id = request.thread_id or str(uuid.uuid4())
config = {"configurable": {"thread_id": thread_id}}
result = campus_app.invoke(initial_state, config=config)
return {"response": ..., "thread_id": thread_id}  # Frontend bir sonraki mesajda geri gönderir
```

### Frontend Entegrasyonu

```typescript
// chatbot.ts
threadId = signal<string | null>(null);

// Her yanıtta thread_id saklanır
next: (res) => {
    if (res.thread_id) this.threadId.set(res.thread_id);
    ...
}

// Her istekte gönderilir
this.ai.askGraph(text, this.threadId(), role, cafeId)
```

---

## 7. Özellik 2 — Human-in-the-Loop (Kampanya Onayı)

### Ne Yapar?
Kafe sahibi kampanya istediğinde, AI önce bir öneri üretir ve **durur**. Sahip onaylayana kadar kampanya oluşturulmaz. Bu, otonom ajanların yanlış işlem yapmasını engeller.

### Akış

```
1. Kafe sahibi yazar: "Kampanya öner"
2. campaign_proposal_node: Stoktan ürünleri çeker, LLM ile öneri yazar
3. Graf DURUR (interrupt_before=["campaign_executor"])
4. API yanıtı: { status: "awaiting_approval", campaign_proposal: "...", thread_id: "xyz" }
5. Frontend: "Onayla" ve "İptal" butonları gösterir
6. Sahip "Onayla"ya tıklar → POST /graph/resume { thread_id: "xyz", decision: "evet" }
7. update_state(config, {"approval_decision": "evet"})
8. Graf devam eder: campaign_executor → CrewAI → Backend DB
9. Kampanya veritabanına kaydedilir
```

### Teknik Detay

```python
# graph.py
return workflow.compile(
    checkpointer=_checkpointer,
    interrupt_before=["campaign_executor"]  # Bu node'dan önce dur
)

# api.py — resume endpoint
@app.post("/graph/resume")
async def resume_campaign(request: CampaignResumeRequest):
    config = {"configurable": {"thread_id": request.thread_id}}
    campus_app.update_state(config, {"approval_decision": request.decision})
    result = campus_app.invoke({"messages": []}, config=config)
    return {"status": "completed", "response": result.get("final_response")}
```

### Frontend Onay Kartı

```typescript
// status: "awaiting_approval" gelince
pendingApproval.set({ threadId: res.thread_id, proposal: res.campaign_proposal });

// Sahip onayladığında
approveCampaign(decision: 'evet' | 'hayır') {
    this.ai.resumeCampaign(state.threadId, decision).subscribe(...)
}
```

---

## 8. Özellik 3 — Reflection Loop (Kendi Kendini Düzelten Öneri)

### Ne Yapar?
LangGraph'ın **döngü desteği** kullanılarak, yemek önerisi üretildikten sonra bir "critic" node devreye girer. Critic öneriyi değerlendirir; yetersiz bulursa geri bildirim yazıp öneri üretimini yeniden tetikler (maksimum 2 tekrar).

### Akış

```
recommendation_handler → öneri üretildi
        ↓
    critic_node → bütçeye uygun mu? fiyat bilgisi var mı? Türkçe mi?
        ├─ VALID   → END (kullanıcıya gönder)
        └─ INVALID → geri bildirim yaz → retry_count++ → recommendation_handler (tekrar)
                         [maks 2 tekrar — sonsuz döngü önlenir]
```

### Teknik Detay

```python
# nodes.py — critic_node
def critic_node(state: GraphState) -> dict:
    retry_count = state.get("retry_count") or 0
    if retry_count >= 2:
        return {"critic_feedback": None}  # Zorla kabul

    result = llm.invoke(f"""
    Bütçe: {budget}, Diyet: {dietary}
    Öneri: {state["final_response"]}

    VALID veya INVALID: [geri bildirim]
    """).content.strip()

    if result.upper().startswith("VALID"):
        return {"critic_feedback": None}

    return {"critic_feedback": result, "retry_count": retry_count + 1}

# graph.py — döngü bağlantısı
workflow.add_edge("recommendation_handler", "critic")
workflow.add_conditional_edges("critic",
    lambda state: "retry" if state.get("critic_feedback") else "end",
    {"retry": "recommendation_handler", "end": END})
```

### Recommendation Node'da Geri Bildirim Kullanımı

```python
# nodes.py — recommendation_node
feedback = state.get("critic_feedback")
if feedback:
    user_input += f"\n\n[Önceki öneri yetersizdi. Lütfen şunu düzelt: {feedback}]"
```

---

## 9. Intent Classifier — Akıllı Yönlendirici

Router, kullanıcı mesajını 5 kategoriye ayırır. Sadece son mesajı değil, **tüm konuşma geçmişini** bağlam olarak kullanır.

```python
def intent_classifier_node(state: GraphState) -> dict:
    conversation = _format_conversation(state["messages"], max_turns=3)
    
    prompt = f"""
    Rol: {role}
    Kategoriler: recommendation | preorder | inventory | campaign | general
    Konuşma: {conversation}
    Sadece kategori adını döndür.
    """
    
    response = llm.invoke(prompt).content.strip().lower()
    # Müşteri, sahip yollarına giremez
    if role == "customer" and response in {"inventory", "campaign"}:
        response = "general"
    
    return {"intent": response}
```

---

## 10. Parameter Extractor — Birikimli Parametre Toplama

Her konuşma turundaki parametreler biriktirilir. Kullanıcı bütçeyi bir mesajda, diyet kısıtını başka bir mesajda belirtebilir.

```python
def param_extractor_node(state: GraphState) -> dict:
    conversation = _format_conversation(state["messages"], max_turns=6)
    prev = state.get("extracted_params") or {}  # Önceki parametreler korunur
    
    # LLM tüm konuşmayı okur, önceki parametreleri günceller veya ekler
    params = llm.invoke(f"""
    Önceki parametreler: {json.dumps(prev)}
    Konuşma: {conversation}
    JSON döndür: {{"budget": ..., "dietary_preferences": ..., "cafe_id": ...}}
    """)
```

---

## 11. LangSmith Entegrasyonu

LangSmith, tüm LangGraph çalışmalarını otomatik olarak izler.

### Konfigürasyon

```bash
# ai_service/.env
LANGCHAIN_TRACING_V2=true
LANGCHAIN_ENDPOINT="https://api.smith.langchain.com"
LANGCHAIN_API_KEY=<api_key>
LANGCHAIN_PROJECT="campuscafe-ai"
```

### Ne İzlenir?
- Her graph çalışmasının trace'i (hangi node'lar çalıştı, ne kadar sürdü)
- Node girdi/çıktıları
- LLM çağrıları (prompt, yanıt, token kullanımı)
- CrewAI agent adımları
- Hata detayları

---

## 12. API Endpoint'leri

| Endpoint | Method | Açıklama |
|---|---|---|
| `/api/ai/graph` | POST | Ana sohbet endpoint'i |
| `/api/ai/graph/resume` | POST | Kampanya onay/ret |
| `/api/ai/chat/recommend` | POST | Direkt öneri (legacy) |
| `/api/ai/chat/inventory` | POST | Direkt stok analizi (legacy) |
| `/api/ai/chat/campaign` | POST | Direkt kampanya (legacy) |

### `/api/ai/graph` İstek Formatı

```json
{
  "message": "200 TL bütçem var, vejetaryen öneri",
  "user_id": "42",
  "auth_token": "Bearer eyJ...",
  "thread_id": "abc-123",
  "role": "customer",
  "cafe_id": null
}
```

### `/api/ai/graph` Yanıt Formatı

```json
{
  "status": "completed",
  "response": "**Önerilen Kombo 1:** ...",
  "intent": "recommendation",
  "thread_id": "abc-123"
}
```

### `/api/ai/graph` Kampanya Durumu Yanıtı

```json
{
  "status": "awaiting_approval",
  "campaign_proposal": "Sandviç için %20 flash sale önerilmektedir...",
  "intent": "campaign",
  "thread_id": "abc-123"
}
```

### `/api/ai/graph/resume` İstek Formatı

```json
{
  "thread_id": "abc-123",
  "decision": "evet"
}
```

---

## 13. CrewAI + LangGraph Entegrasyonu

Her iki framework tek projede birlikte çalışmaktadır. LangGraph, CrewAI'yi bir **tool** gibi çağırır.

```
ai_service/
  src/
    campuscafe_crew/
      graph.py      ← LangGraph graph tanımı
      nodes.py      ← LangGraph node fonksiyonları
      crew.py       ← CrewAI Crew/Agent tanımları
      tools/
        custom_tool.py  ← CrewAI tool'ları (backend API çağrıları)
      config/
        agents.yaml     ← CrewAI agent konfigürasyonu
        tasks.yaml      ← CrewAI task konfigürasyonu
      api.py        ← FastAPI endpoint'leri
```

**LangGraph, CrewAI'yi şöyle çağırır:**

```python
# nodes.py — recommendation_node içinde
def recommendation_node(state: GraphState) -> dict:
    crew = CampusCafeCrew().recommendation_crew()  # CrewAI
    result = crew.kickoff(inputs={
        "budget": params.get("budget"),
        "user_history": state.get("user_context"),
        "user_input": user_input,
    })
    return {"final_response": str(result)}
```

### CrewAI Agent'ları

| Agent | Görev | Tool'lar |
|---|---|---|
| `budget_health_advisor` | Yemek önerisi | MenuSearchTool |
| `preorder_predictor` | Ön sipariş tahmini | MenuSearchTool, OrderHistoryTool |
| `inventory_trend_monitor` | Stok analizi | InventoryCheckerTool |
| `campaign_manager` | Kampanya oluşturma | InventoryCheckerTool, CampaignCreatorTool |

---

## 14. Frontend Entegrasyonu (Angular)

Chatbot bileşeni (`chatbot.ts`) tüm LangGraph özelliklerini destekler.

### Mod Yapısı

| Mod | Hedef Kitle | LangGraph Intent |
|---|---|---|
| Asistan | Herkes | Otomatik (intent_classifier karar verir) |
| Öneri | Öğrenci/Öğretmen | `recommendation` |
| Ön Sipariş | Öğrenci/Öğretmen | `preorder` |
| Stok | Kafe Sahibi | `inventory` |
| Kampanya | Kafe Sahibi | `campaign` |

### Persistence Kullanımı

```typescript
// Thread ID saklanır, her istekte gönderilir
threadId = signal<string | null>(null);

this.ai.askGraph(text, this.threadId(), role, cafeId)
    .subscribe(res => {
        if (res.thread_id) this.threadId.set(res.thread_id);
    });
```

### Human-in-the-Loop UI

`status: "awaiting_approval"` gelince "Onayla" / "İptal" butonları gösterilir. Karar `/graph/resume`'a gönderilir.

---

## 15. Proje Çalıştırma Adımları

### Ön Koşullar
- Node.js 18+
- Python 3.11
- OpenAI API Key

### Terminal 1 — Backend

```bash
cd campuscafe_draft/backend
npm run dev
# → http://localhost:3000
```

### Terminal 2 — AI Servisi

```bash
cd campuscafe_draft/ai_service/src
source ../venv/bin/activate
uvicorn campuscafe_crew.api:app --reload --port 8000
# → http://localhost:8000
# → http://localhost:8000/docs  (Swagger UI)
```

### Terminal 3 — Frontend

```bash
cd campuscafe_draft/frontend/campuscafe-ui
npm start
# → http://localhost:4200
```

### Başlatma Sırası

```
1. Backend   → 2. AI Servisi   → 3. Frontend
```

---

## 16. Örnek Kullanım Senaryoları

### Senaryo A — Çok Turlu Öneri (Persistence)

```
Kullanıcı: "Merhaba"
AI:        "Merhaba! Size nasıl yardımcı olabilirim?"

Kullanıcı: "150 TL bütçem var"
AI:        [param_extractor: budget=150 kaydedildi]
           "Bütçenizi kaydettim! Diyet kısıtınız var mı?"

Kullanıcı: "Vejetaryen olsun"
AI:        [param_extractor: budget=150 + dietary=vejetaryen BİRLEŞTİ]
           [recommendation_handler → critic → VALID]
           "**Önerilen Kombo:** Peynirli tost (45 TL) + Sebze çorbası (35 TL)..."
```

### Senaryo B — Kampanya Onayı (Human-in-the-Loop)

```
Kafe Sahibi: "Kampanya öner"
AI:          [campaign_proposal_node çalıştı, graf durdu]
             "Sandviç için %20 flash sale önerilmektedir..."
             [Onayla] [İptal]

Sahip: [Onayla] tıklar
AI:    [campaign_executor: CrewAI → Backend DB'ye kaydedildi]
       "Kampanya başarıyla oluşturuldu!"
```

### Senaryo C — Reflection Loop

```
Kullanıcı: "100 TL bütçe"
AI:        [1. deneme: "Türk kahvesi + kurabiye = 85 TL"] 
           [critic: "Fiyat bilgisi eksik → INVALID"]
           [2. deneme: "Türk kahvesi (35 TL) + Kurabiye (50 TL) = 85 TL ✓"]
           [critic: VALID]
           → Kullanıcıya gönderilir
```

---

## 17. Özet

Bu projede LangGraph ile aşağıdakiler gerçekleştirildi:

| # | Özellik | Durum |
|---|---|---|
| 1 | CrewAI ile birlikte çalışan LangGraph graf | ✅ |
| 2 | 5 intent yoluna sahip akıllı router | ✅ |
| 3 | Birikimli parametre çıkarma | ✅ |
| 4 | thread_id ile konuşma persistence | ✅ |
| 5 | Human-in-the-Loop kampanya onay akışı | ✅ |
| 6 | Reflection Loop — kendi kendini düzelten öneri | ✅ |
| 7 | LangSmith tracing entegrasyonu | ✅ |
| 8 | Angular chatbot ile tam entegrasyon | ✅ |
| 9 | Kapsamlı hata yönetimi ve loglama | ✅ |

**GitHub:** https://github.com/smhavci/campuscafe-draft
