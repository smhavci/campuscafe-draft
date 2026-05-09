# MCP Entegrasyon Planı — CampusCafe

## 1. MCP Nedir?

Model Context Protocol, AI modellerinin dış veri ve araçlara **standart bir protokol** (JSON-RPC 2.0) üzerinden bağlanmasını sağlar. Anthropic'in 2024'te yayınladığı açık standarttır.

Tek cümleyle: **Araç tanımını (tool definition) araç kullanımından (tool use) ayıran protokol.**

---

## 2. Projenin Şu Anki Hali

Mevcut veri akışı:

```
Angular Chatbot
    ↓ HTTP POST /api/ai/graph
Node.js Backend (routes/ai.js)
    ↓ HTTP POST /graph (proxy)
FastAPI — api.py
    ↓
LangGraph — graph.py
    ├── intent_classifier_node     → doğrudan LLM çağrısı
    ├── param_extractor_node       → doğrudan LLM çağrısı
    ├── user_context_node          → doğrudan requests.get("/api/orders")
    ├── recommendation_node        → CrewAI crew kickoff
    │       └── budget_health_advisor (agent)
    │               └── MenuSearchTool (BaseTool) → requests.get("/api/products")
    ├── preorder_node              → CrewAI crew kickoff
    │       └── preorder_predictor (agent)
    │               └── MenuSearchTool + OrderHistoryTool → HTTP
    ├── inventory_node             → CrewAI crew kickoff
    │       └── inventory_trend_monitor (agent)
    │               └── InventoryCheckerTool → HTTP
    ├── campaign_proposal_node     → doğrudan requests.get("/api/products")
    └── campaign_executor_node     → CrewAI crew kickoff
            └── campaign_manager (agent)
                    └── InventoryCheckerTool + CampaignCreatorTool → HTTP
```

### Sorunlar

**1. HTTP çağrıları her yere dağılmış:**
- `nodes.py` içinde `user_context_node` → `requests.get`
- `nodes.py` içinde `campaign_proposal_node` → `requests.get`
- `custom_tool.py` içinde 4 farklı tool → `requests.get/post`
- Bunların hepsi backend URL'ini biliyor, auth header'ı kendisi yönetiyor

**2. Araçlar CrewAI'ya kilitli:**
- `MenuSearchTool`, `OrderHistoryTool` vb. `crewai.tools.BaseTool`'dan türüyor
- Sadece CrewAI'nın anlayabileceği format — LangGraph node'ları doğrudan kullanamıyor
- Bu yüzden bazı node'lar (user_context, campaign_proposal) CrewAI'yı bypass edip
  doğrudan `requests` kullanmak zorunda kalmış

**3. Tool tanımı ile tool kullanımı iç içe:**
- Bir tool'u değiştirmek (örn. `OrderHistoryTool`'a yeni parametre eklemek)
  hem `custom_tool.py`'ı hem `crew.py`'ı hem de `nodes.py`'daki çağrı noktasını etkiliyor

---

## 3. MCP Burada Ne Yapar?

MCP şunu değiştirir: **Tüm backend araçları tek bir MCP server'da tanımlanır. LangGraph node'ları bu araçları `langchain-mcp-adapters` üzerinden kullanır.**

```
LangGraph node'u
    ↓
langchain-mcp-adapters (MCP Client)
    ↓ JSON-RPC over stdio/SSE
MCP Server — mcp_server.py
    ↓ HTTP
CampusCafe Backend :3000
```

### Ne değişir?

| Şu An | MCP Sonrası |
|---|---|
| `custom_tool.py` → 4 CrewAI BaseTool | `mcp_server.py` → 4 MCP tool |
| `nodes.py`'da dağınık `requests.get` | Hepsi MCP client üzerinden |
| Tool sadece CrewAI kullanabilir | LangGraph node'ları doğrudan kullanabilir |
| Tool değişince 3 dosya güncellenir | Sadece `mcp_server.py` güncellenir |
| HTTP çağrı mantığı her node'da tekrarlanır | MCP server'da tek noktada |

### Ne değişmez?

- `graph.py` — LangGraph akış yapısı aynı kalır
- `graph.py` — Human-in-the-Loop (campaign interrupt) aynı
- `graph.py` — Reflection loop (critic) aynı
- `api.py` — FastAPI endpoint'leri aynı
- Intent sınıflandırma, parametre çıkarma mantığı aynı
- CrewAI agent'lar (agents.yaml, tasks.yaml) kaldırılabilir ya da tutulabilir

---

## 4. Hangi Araçlar MCP'ye Taşınır?

| Araç | Şu An | MCP Sonrası | Hangi Node Kullanır |
|---|---|---|---|
| Menü arama | `MenuSearchTool` (BaseTool) | `search_menu` (MCP tool) | recommendation, preorder |
| Sipariş geçmişi | `OrderHistoryTool` (BaseTool) | `get_order_history` (MCP tool) | user_context, preorder |
| Stok kontrolü | `InventoryCheckerTool` (BaseTool) | `check_inventory` (MCP tool) | inventory, campaign_proposal |
| Kampanya oluşturma | `CampaignCreatorTool` (BaseTool) | `create_campaign` (MCP tool) | campaign_executor |

---

## 5. Uygulama Planı

### Dosya Yapısı (Değişecekler)

```
ai_service/
├── mcp_server.py                  ← YENİ: tüm araçların tek tanım noktası
├── src/campuscafe_crew/
│   ├── tools/
│   │   ├── custom_tool.py         ← KALDIRILACAK (MCP server'a taşınır)
│   │   └── mcp_client.py          ← YENİ: LangGraph için MCP bağlantısı
│   ├── nodes.py                   ← GÜNCELLENİR (MCP client kullanır)
│   ├── crew.py                    ← BASİTLEŞİR (MCP tools ile çalışır)
│   ├── graph.py                   ← DEĞİŞMEZ
│   └── api.py                     ← DEĞİŞMEZ
```

### Adım 1: `mcp_server.py` — Araç Tanım Katmanı

`custom_tool.py`'daki 4 tool ve `nodes.py`'daki dağınık HTTP çağrıları buraya taşınır.
FastMCP ile SSE transport üzerinden çalışır (HTTP — web uygulamasına uygun).

```python
from mcp.server.fastmcp import FastMCP
mcp = FastMCP("campuscafe")

@mcp.tool()
def search_menu(cafe_id=None, max_price=None, category=None) -> str: ...

@mcp.tool()
def get_order_history(user_id: str, auth_token: str, limit=10) -> str: ...

@mcp.tool()
def check_inventory(cafe_id: str) -> str: ...

@mcp.tool()
def create_campaign(cafe_id, name, description, discount, products) -> str: ...
```

SSE modunda çalıştırılır — hem LangGraph hem de potansiyel başka clientlar bağlanabilir:
```bash
python3 mcp_server.py  # SSE transport, port 8001
```

### Adım 2: `tools/mcp_client.py` — LangGraph İçin Bağlantı Köprüsü

`langchain-mcp-adapters` paketi MCP toolları LangChain-uyumlu tool'lara çevirir.
LangGraph node'ları bu wrapper'ı kullanır.

```python
from langchain_mcp_adapters.client import MultiServerMCPClient

async def get_mcp_tools():
    client = MultiServerMCPClient({
        "campuscafe": {
            "url": "http://localhost:8001/sse",
            "transport": "sse"
        }
    })
    return await client.get_tools()
    # → LangChain tool listesi döner: [search_menu, get_order_history, ...]
```

### Adım 3: `nodes.py` — Node'ların Güncellenmesi

**Önce (`user_context_node`):**
```python
# nodes.py — doğrudan HTTP
response = requests.get(
    f"{backend_url}/api/orders",
    headers={"Authorization": f"Bearer {auth_token}"},
)
```

**Sonra (`user_context_node`):**
```python
# nodes.py — MCP üzerinden
tools = await get_mcp_tools()
order_tool = next(t for t in tools if t.name == "get_order_history")
result = await order_tool.ainvoke({"user_id": user_id, "auth_token": auth_token})
```

Aynı mantık `campaign_proposal_node` için de geçerli — `requests.get("/api/products")`
yerine `check_inventory` MCP tool'u çağrılır.

### Adım 4: `crew.py` — CrewAI Toollarının Güncellenmesi

CrewAI agent'ları `BaseTool` yerine MCP'den dönüştürülmüş tool'ları alır.
`langchain-mcp-adapters` bunu sağlar — CrewAI de LangChain tool'larını kabul eder.

```python
# crew.py — önce
from .tools.custom_tool import MenuSearchTool
agent = Agent(..., tools=[MenuSearchTool()])

# crew.py — sonra  
from .tools.mcp_client import get_mcp_tools_sync
tools = get_mcp_tools_sync()  # MCP'den al
menu_tool = next(t for t in tools if t.name == "search_menu")
agent = Agent(..., tools=[menu_tool])
```

---

## 6. Transport Seçimi: stdio vs SSE

| | stdio | SSE (HTTP) |
|---|---|---|
| Nasıl çalışır | subprocess stdin/stdout | HTTP GET /sse stream |
| Ne için uygun | Claude Desktop, CLI uygulamalar | Web uygulamaları, birden fazla client |
| Bu proje için | UYGUN DEĞİL (web app) | UYGUN |
| Port | Yok | 8001 (API :8000 ile çakışmaz) |

**Bu projede SSE kullanılacak** — AI service zaten HTTP sunucu, MCP server da HTTP/SSE ile çalışır.

---

## 7. Sınıf Sunumunda Gösterilecekler

### Gösterilebilecek Akış

```
1. MCP server başlatılır (port 8001)
2. LangGraph node'u MCP'ye bağlanır
3. "Hangi araçlar var?" sorusu → server araç listesini döndürür
4. Kullanıcı chatbot'a yazar → node MCP tool'unu çağırır → backend'den veri gelir
5. Protokol mesajları logda görünür
```

### Somut Fark

**Eski (custom_tool.py):**
```
recommendation_node → CampusCafeCrew().kickoff() → MenuSearchTool._run() → requests.get(...)
```
Tool kodu agent kodunun içinde, backend URL hardcoded, sadece CrewAI kullanabilir.

**Yeni (MCP):**
```
recommendation_node → MCP client → JSON-RPC → MCP server → requests.get(...)
```
Node tool'un nasıl çalıştığını bilmiyor. Sadece "search_menu({category: 'yiyecek'})" diyor.
MCP server değişse, node kodu değişmez.

---

## 8. Bağımlılıklar (pyproject.toml)

```toml
"mcp[cli]>=1.3.0",           # zaten eklendi
"langchain-mcp-adapters>=0.1.0",   # LangGraph entegrasyonu için
```
