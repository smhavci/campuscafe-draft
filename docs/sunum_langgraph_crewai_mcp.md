# CampusCafe AI — Sınıf Sunumu
## LangGraph + CrewAI + MCP: Kod Üzerinden Anlatım

---

## 1. Sistemin Tamamı — Tek Bakışta

```
Kullanıcı → Angular Chatbot
                ↓ HTTP POST /api/ai/graph
            Node.js Backend  (routes/ai.js — sadece proxy)
                ↓ HTTP POST /graph
            FastAPI           (api.py — giriş kapısı)
                ↓
            LangGraph         (graph.py + nodes.py — karar merkezi)
                ↓
            CrewAI            (crew.py — iş yapan uzmanlar)
                ↓
            Backend REST API  (/api/products, /api/orders ...)
```

Ve artık bir dal daha var:

```
            LangGraph
                ↓ öneri isteğinde
            MCP Client        (nodes.py içinde)
                ↓ JSON-RPC / SSE
            MCP Server        (mcp_server.py — ayrı process)
                ↓ HTTP
            OpenWeatherMap API → Antalya: 20°C, parçalı bulutlu
```

---

## 2. LangGraph — Karar Mekanizması

### "Graf" Ne Demek?

LangGraph iş akışını bir **yönlü graf** olarak modeller.
Her kutu bir **node** (adım), her ok bir **edge** (geçiş koşulu).

```
graph.py — 55. satır:
workflow.set_entry_point("intent_classifier")
```

Her mesaj buradan girer. Sonra koşullu kenarlar devralır.

### Karar Mekanizması: Conditional Edges

```python
# graph.py — 58-68. satırlar
workflow.add_conditional_edges(
    "intent_classifier",
    lambda state: state["intent"],   # ← bu değer neye eşitse o yola git
    {
        "general":        "general_handler",
        "recommendation": "param_extractor",
        "preorder":       "param_extractor",
        "inventory":      "param_extractor",
        "campaign":       "param_extractor",
    },
)
```

**Nasıl çalışır:**
1. `intent_classifier` node'u çalışır, `state["intent"]` değerini yazar
2. LangGraph bu değere bakar
3. Eşleşen yola gider

`intent_classifier` node'u içinde ne var?

```python
# nodes.py — 80-101. satırlar
def intent_classifier_node(state: GraphState) -> dict:
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    prompt = f"""Sen CampusCafe'nin akıllı yönlendiricisisin.
    ...
    Sadece kategori adını döndür: recommendation / preorder / inventory / campaign / general
    """
    response = llm.invoke(prompt).content.strip().lower()
    return {"intent": response}   # ← state'e yaz, conditional edge okur
```

GPT-4o-mini'ye kullanıcının mesajını soruyor, tek kelime cevap alıyor, state'e yazıyor. LangGraph bu değeri okuyup yönlendiriyor.

### State Nedir?

Tüm akış boyunca taşınan ortak veri paketi:

```python
# nodes.py — 13-29. satırlar
class GraphState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]  # konuşma geçmişi
    intent: str          # recommendation | preorder | inventory | campaign | general
    final_response: str  # kullanıcıya gidecek yanıt
    user_id: str
    auth_token: str
    user_context: str    # sipariş geçmişi özeti
    extracted_params: dict   # budget, dietary_preferences, cafe_id
    role: str            # customer | owner
    campaign_proposal: str   # Human-in-the-Loop için
    approval_decision: str
    retry_count: int         # Reflection Loop için
    critic_feedback: str
```

Her node bu paketten okur, günceller, bir sonraki node alır.

### Reflection Loop — Öneri Kalite Kontrolü

```python
# graph.py — 97-105. satırlar
workflow.add_edge("recommendation_handler", "critic")
workflow.add_conditional_edges(
    "critic",
    lambda state: "retry" if state.get("critic_feedback") else "end",
    {
        "retry": "recommendation_handler",   # ← geri dön, tekrar dene
        "end":   END,
    },
)
```

Öneri üretilir → critic kalite kontrolü yapar → yetersizse `recommendation_handler`'a geri döner → maks 2 kez tekrar.

### Human-in-the-Loop — Kampanya Onayı

```python
# graph.py — 111-114. satırlar
return workflow.compile(
    checkpointer=_checkpointer,
    interrupt_before=["campaign_executor"],  # ← burada dur, sahibin onayını bekle
)
```

`campaign_proposal` node'u çalışır, graf DURUR. Sahip "evet/hayır" der, `/graph/resume` endpoint'i çağrılır, graf kaldığı yerden devam eder.

### Konuşma Hafızası

```python
# graph.py — 19. satır
_checkpointer = MemorySaver()
```

```python
# api.py — 89-90. satırlar
thread_id = request.thread_id or str(uuid.uuid4())
config = {"configurable": {"thread_id": thread_id}}
```

Her konuşmanın bir `thread_id`'si var. Aynı thread_id ile gelen mesajlar önceki konuşmayı hatırlıyor. "50 TL bütçem var" → "vejetaryen olsun" → LangGraph ikisini birlikte değerlendiriyor.

---

## 3. CrewAI — İş Yapan Uzmanlar

### LangGraph ile İlişkisi

LangGraph'ın `recommendation_node`'u şunu yapıyor:

```python
# nodes.py — 198-210. satırlar
async def recommendation_node(state: GraphState) -> dict:
    # 1. MCP'den hava al
    weather_context = await _get_weather_from_mcp()

    # 2. CrewAI'yı çalıştır
    crew = CampusCafeCrew().recommendation_crew()
    result = crew.kickoff(inputs={
        "budget": ...,
        "dietary_preferences": ...,
        "weather_context": weather_context,   # ← MCP'den geliyor
        ...
    })
```

**LangGraph karar veriyor, CrewAI iş yapıyor.**

### Agent Tanımı

```python
# crew.py — 28-33. satırlar
@agent
def budget_health_advisor(self) -> Agent:
    return Agent(
        config=self.agents_config["budget_health_advisor"],
        tools=[MenuSearchTool()],   # ← bu araçla menüye bakabilir
        verbose=True,
    )
```

Agent ne yapacağını `agents.yaml`'dan öğreniyor:

```yaml
# config/agents.yaml
budget_health_advisor:
  role: Campus Dining Budget & Health Advisor
  goal: Help students find the best meal options within their budget
  backstory: You are a knowledgeable campus dining advisor...
```

### Task Tanımı

Agent ne yapacağını task'tan alıyor:

```yaml
# config/tasks.yaml
recommend_meal_task:
  description: >
    Analyze the current menu and recommend the best meal options.
    - Budget: {budget} TL
    - Dietary preferences: {dietary_preferences}
    - Current weather: {weather_context}    ← MCP'den gelen veri buraya giriyor

    IMPORTANT: Hot weather (25°C+) → cold drinks and light meals.
               Cold weather → hot drinks and warming meals.
  agent: budget_health_advisor
```

### Tool — MenuSearchTool

Agent menüye bakmak istediğinde bu tool'u çağırıyor:

```python
# tools/custom_tool.py — 31-55. satırlar
class MenuSearchTool(BaseTool):
    name: str = "menu_search"
    description: str = "Searches the CampusCafe menu for available items."

    def _run(self, cafe_id=None, max_price=None, category=None) -> str:
        response = requests.get(f"{BACKEND_URL}/api/products", ...)
        # Backend'den ürün listesini çeker, metin olarak döndürür
```

Agent bu tool'u kendi kararıyla çağırıyor — "menüye bakayım" diye düşündüğünde otomatik devreye giriyor.

---

## 4. MCP — Hangi Özelliği Kullandık?

MCP'nin üç ana bileşeni var:
- **Tools** → AI'ın çalıştırdığı fonksiyonlar ✅ **BİZ BUNU KULLANDIK**
- **Resources** → AI'ın okuduğu veri kaynakları (kullanmadık)
- **Prompts** → Hazır şablon sistemi (kullanmadık)

### MCP Tool Tanımı

```python
# mcp_server.py — 27-82. satırlar
@mcp.tool()
def get_current_weather(city: str = "Ankara") -> str:
    """
    Belirtilen şehrin anlık hava durumunu döndürür.
    Bu docstring AI'a gösteriliyor — tool'un ne yaptığını buradan anlıyor.
    """
    response = requests.get(
        "https://api.openweathermap.org/data/2.5/weather",
        params={"q": city, "appid": OPENWEATHER_API_KEY, ...}
    )
    # → "Antalya hava durumu: parçalı bulutlu, sıcaklık 20°C..."
```

`@mcp.tool()` dekoratörü bu fonksiyonu MCP protokolüne kaydeder.
Artık herhangi bir MCP istemcisi bu tool'u **keşfedebilir ve çağırabilir.**

### MCP İstemci — LangGraph İçinden Çağrı

```python
# nodes.py — 172-188. satırlar
async def _get_weather_from_mcp() -> str:
    from langchain_mcp_adapters.client import MultiServerMCPClient

    client = MultiServerMCPClient({
        "weather": {
            "url": "http://localhost:8001/sse",   # MCP server adresi
            "transport": "sse"                     # HTTP/SSE protokolü
        }
    })
    tools = await client.get_tools()   # "hangi araçlar var?" → [get_current_weather]
    weather_tool = next(t for t in tools if t.name == "get_current_weather")
    result = await weather_tool.ainvoke({"city": "Antalya"})
    return str(result)
```

**Protokol akışı:**
```
LangGraph node
    → MultiServerMCPClient
    → HTTP GET http://localhost:8001/sse    (bağlan)
    → JSON-RPC: {"method": "tools/list"}   (araçları keşfet)
    ← ["get_current_weather"]
    → JSON-RPC: {"method": "tools/call",
                 "params": {"name": "get_current_weather",
                            "arguments": {"city": "Antalya"}}}
    ← "Antalya hava durumu: parçalı bulutlu, 20°C..."
```

### Transport: SSE (Server-Sent Events)

MCP iki transport destekliyor:
- **stdio** — Claude Desktop gibi masaüstü uygulamalar için
- **SSE** — Web uygulamaları için ✅ **BİZ BUNU KULLANDIK**

SSE seçtik çünkü sistemimiz zaten HTTP üzerinde çalışıyor (FastAPI, Node.js). MCP server da HTTP sunucusu olarak çalışıyor — port 8001.

### Neden MCP, Neden Direkt HTTP Değil?

Direkt HTTP ile de OpenWeatherMap'i çağırabilirdik:
```python
# Bu da çalışırdı ama MCP değil
requests.get("https://api.openweathermap.org/...")
```

MCP ile fark:
- Tool **discovery** var — client bağlanıp "ne yapabilirsin?" diye soruyor
- Tool tanımı (`mcp_server.py`) ile kullanımı (`nodes.py`) **birbirinden ayrı**
- Yarın OpenWeatherMap yerine başka bir hava servisi kullansak sadece `mcp_server.py` değişir, `nodes.py`'a dokunmayız
- Başka bir AI uygulaması da bu MCP server'a bağlanabilir

---

## 5. Sınıfta Kod Gösterme Sırası

### Adım 1 — Kullanıcı mesaj yazar, LangGraph devralır
`api.py` — 79-135. satırlar göster
> "Frontend'den gelen istek buraya düşüyor, LangGraph'a veriyor"

### Adım 2 — LangGraph niyeti anlıyor
`graph.py` — 58-68. satırlar göster
> "Conditional edge — intent değerine göre farklı yola gidiyor"

`nodes.py` — 72-101. satırlar göster
> "Intent classifier GPT-4o-mini'ye soruyor, tek kelime alıyor"

### Adım 3 — Öneri yolunda MCP devreye giriyor
`nodes.py` — 155-210. satırlar göster
> "recommendation_node önce MCP'den hava alıyor, sonra CrewAI'ya veriyor"

`mcp_server.py` — 27-82. satırlar göster
> "MCP tool tanımı burada — @mcp.tool() dekoratörü ile kayıt"

**MCP server terminalini göster:**
```
[MCP] get_current_weather çağrıldı → şehir: Antalya
[MCP] Hava durumu alındı: parçalı bulutlu, sıcaklık 20°C...
```

### Adım 4 — CrewAI hava verisini kullanarak öneri yapıyor
`crew.py` — 28-33. satırlar göster
> "budget_health_advisor agent, MenuSearchTool ile menüye bakıyor"

`config/tasks.yaml` — recommend_meal_task göster
> "weather_context buraya geliyor, agent sıcak havada soğuk öneri yapıyor"

### Adım 5 — Reflection loop
`graph.py` — 97-105. satırlar göster
> "Critic öneriyi kontrol ediyor, yetersizse geri gönderiyor"

---

## 6. Özet Tablo

| | **LangGraph** | **CrewAI** | **MCP** |
|---|---|---|---|
| Dosya | graph.py, nodes.py | crew.py, custom_tool.py | mcp_server.py |
| Rolü | Orkestratör, karar verici | Uzman iş yapan | Dış veri protokolü |
| Ne biliyor | Niyeti, akışı, geçmişi | Menüyü, siparişleri | Hava durumunu |
| Nasıl karar veriyor | Conditional edges | Agent kendi kararıyla tool çağırır | Tool discovery (tools/list → tools/call) |
| Özel özellik | Human-in-the-Loop, Reflection Loop | Multi-agent, tool use | SSE transport, JSON-RPC |
| Birbirini nasıl kullanır | LangGraph → CrewAI'yı çağırır | CrewAI → MenuSearchTool'u çağırır | LangGraph → MCP client → MCP server |
