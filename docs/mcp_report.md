# CampusCafe — MCP (Model Context Protocol) Entegrasyon Raporu

**GitHub:** https://github.com/smhavci/campuscafe-draft

---

## 1. Proje Genel Bakışı

CampusCafe, üniversite kafeterya yönetimi için geliştirilmiş full-stack bir uygulamadır. Angular tabanlı kullanıcı arayüzü, Node.js/Express backend, SQLite veritabanı ve yapay zeka modülünden oluşmaktadır. AI modülü; **LangGraph** (orkestrasyon), **CrewAI** (ajan yönetimi) ve **MCP** (araç protokolü) teknolojilerini bir arada kullanmaktadır.

---

## 2. MCP (Model Context Protocol) Nedir?

**Model Context Protocol (MCP)**, Anthropic tarafından 2024 yılında yayımlanan açık bir standarttır. AI modellerinin dış veri kaynaklarına ve araçlara **standart bir protokol** (JSON-RPC 2.0) üzerinden bağlanmasını sağlar.

### Temel Fikir

MCP'den önce her AI uygulaması kendi araçlarını kendine özgü biçimde tanımlıyordu. MCP bu sorunu şu prensiple çözer:

> **"Araç tanımı (tool definition) araç kullanımından (tool use) ayrılmalıdır."**

```
Geleneksel Yaklaşım:
   AI Model  ←→  Uygulama kodu (araç burada gömülü)

MCP ile:
   AI Model  →  MCP Client  →  MCP Server  →  Gerçek araç
```

### MCP'nin Faydaları

| Özellik | Geleneksel | MCP |
|---|---|---|
| Araç paylaşımı | Sadece aynı framework | Tüm MCP-uyumlu istemciler |
| Protokol | Her uygulama farklı | JSON-RPC 2.0 standardı |
| Bağımsızlık | Araç koda gömülü | Server bağımsız çalışır |
| Transport | Yok (in-process) | stdio / SSE / HTTP |

---

## 3. CampusCafe Projesinde MCP Mimarisi

### 3.1 Veri Akışı

```
Kullanıcı (Angular)
        │  HTTP
        ▼
Node.js Backend (:3000)
        │  HTTP proxy
        ▼
FastAPI + LangGraph (:8000)
        │
        ├─── intent_classifier_node  (GPT-4o-mini)
        ├─── param_extractor_node    (GPT-4o-mini)
        ├─── user_context_node       (Backend API)
        │
        └─── recommendation_node ──────────────────┐
                    │                               │
                    │  JSON-RPC over SSE            │
                    ▼                               │
            MCP Server (:8001)  ◄──────────────────┘
                    │
                    └── get_current_weather()
                                │  HTTP
                                ▼
                    OpenWeatherMap API
```

### 3.2 MCP'nin Projedeki Rolü

Kullanıcı yemek önerisi istediğinde sistem şunları yapar:

1. **LangGraph** isteği `recommendation_node`'a yönlendirir
2. Node, **MCP client** (`langchain-mcp-adapters`) üzerinden MCP server'a bağlanır
3. MCP server `get_current_weather` aracını çalıştırır → OpenWeatherMap'ten veri çeker
4. Hava durumu verisi (sıcaklık, nem, açıklama) node'a döner
5. CrewAI, hava durumunu da dikkate alarak kişiselleştirilmiş öneri üretir

---

## 4. Kodun İncelenmesi

### 4.1 MCP Server (`ai_service/mcp_server.py`)

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("campuscafe-weather", port=8001)

@mcp.tool()
def get_current_weather(city: str = "Ankara") -> str:
    """Anlık hava durumu — sıcaklık, nem, rüzgar ve öneri ipucu döner."""
    response = requests.get(
        "https://api.openweathermap.org/data/2.5/weather",
        params={"q": city, "appid": API_KEY, "units": "metric", "lang": "tr"},
    )
    data = response.json()
    temp = round(data["main"]["temp"])

    if temp >= 28:
        tip = "Soğuk içecekler ve hafif yemekler öner."
    elif temp <= 10:
        tip = "Sıcak içecekler ve doyurucu yemekler öner."
    else:
        tip = "Dengeli öneriler yap."

    return f"{city}: {data['weather'][0]['description']}, {temp}°C. {tip}"

if __name__ == "__main__":
    mcp.run(transport="sse")   # HTTP/SSE — web uygulaması için uygun
```

**Önemli noktalar:**
- `@mcp.tool()` dekoratörü fonksiyonu otomatik olarak JSON-RPC tool'una dönüştürür
- `transport="sse"` seçimi: web uygulaması olduğu için HTTP/SSE tercih edildi (stdio yerine)
- Port `8001` — FastAPI `8000` ile çakışmaz
- Hava durumuna göre otomatik öneri ipucu üretilir

### 4.2 LangGraph Tarafındaki MCP İstemcisi (`ai_service/src/campuscafe_crew/nodes.py`)

```python
from langchain_mcp_adapters.client import MultiServerMCPClient

async def _get_weather_from_mcp() -> str:
    """MCP server'dan anlık hava durumu çeker.
    Server çalışmıyorsa sessizce fallback döner — sistemi bozmaz.
    """
    mcp_url = os.getenv("MCP_SERVER_URL", "http://localhost:8001/sse")
    city = os.getenv("CAMPUS_CITY", "Ankara")
    try:
        client = MultiServerMCPClient({
            "weather": {"url": mcp_url, "transport": "sse"}
        })
        tools = await client.get_tools()
        weather_tool = next(t for t in tools if t.name == "get_current_weather")
        result = await weather_tool.ainvoke({"city": city})
        return str(result)
    except Exception as e:
        print(f"⚠️  MCP bağlantısı kurulamadı ({e}) — hava durumu olmadan devam")
        return ""
```

**Önemli noktalar:**
- `MultiServerMCPClient`: birden fazla MCP server'a bağlanabilir (genişletilebilir)
- `client.get_tools()`: server'dan mevcut araç listesini JSON-RPC ile çeker
- `ainvoke`: async çağrı — LangGraph'ın async yürütme modeliyle uyumlu
- `try/except`: MCP server çalışmıyorsa sistem durmuyor, boş string dönerek devam ediyor

### 4.3 `recommendation_node`'da Entegrasyon

```python
async def recommendation_node(state: GraphState) -> dict:
    # MCP'den hava durumu al
    weather_context = await _get_weather_from_mcp()

    # CrewAI'ya hem kullanıcı geçmişi hem hava durumu veriliyor
    crew = CampusCafeCrew().recommendation_crew()
    result = crew.kickoff(inputs={
        "budget":              str(params.get("budget") or "belirtilmemiş"),
        "dietary_preferences": params.get("dietary_preferences") or "yok",
        "user_history":        state.get("user_context"),
        "user_input":          user_input,
        "weather_context":     weather_context or "Hava durumu bilgisi mevcut değil.",
    })
```

---

## 5. Transport Seçimi: stdio vs SSE

| | stdio | SSE (HTTP) |
|---|---|---|
| Çalışma şekli | Alt process stdin/stdout | HTTP GET /sse stream |
| Uygun olduğu yer | Claude Desktop, CLI araçları | Web uygulamaları |
| Birden fazla client | Hayır | Evet |
| Bu projede | Uygun değil | **Seçilen yöntem** |

CampusCafe bir web uygulaması olduğu için SSE transport tercih edildi. MCP server `http://localhost:8001/sse` adresinde çalışır; hem LangGraph hem de potansiyel olarak başka bir client aynı anda bağlanabilir.

---

## 6. Çalıştırma ve Canlı Gösterim

### Adım 1: MCP Server'ı Başlat

```bash
cd ai_service
python3 mcp_server.py
```

Çıktı:
```
====================================================
  CampusCafe MCP Server başlatılıyor
  Şehir: Antalya
  API Key: ✅ Tanımlı
  Adres: http://localhost:8001/sse
====================================================
```

### Adım 2: AI Service'i Başlat

```bash
cd ai_service
uvicorn src.campuscafe_crew.api:app --port 8000
```

### Adım 3: Chatbot'a Yemek Önerisi İste

Kullanıcı chatbot'a yazar: _"Bugün ne yesem, bütçem 80 TL"_

Terminal çıktısında şu adımları görmek mümkündür:

```
[LangGraph] ▶ intent_classifier
[LangGraph]   Mesaj: Bugün ne yesem, bütçem 80 TL
[LangGraph]   Intent → RECOMMENDATION
[LangGraph] ▶ param_extractor
[LangGraph]   Parametreler → {"budget": 80, ...}
[LangGraph] ▶ user_context  (sipariş geçmişi çekiliyor)
[LangGraph] ▶ recommendation_handler  (CrewAI + MCP devreye giriyor)
[MCP] get_current_weather çağrıldı → şehir: Antalya
[MCP] Hava durumu alındı: Antalya: açık hava, 27°C... Soğuk içecekler öner.
🌤️  MCP hava durumu: Antalya: açık hava, 27°C...
```

### Adım 4: Araç Listesini Doğrula (Opsiyonel)

MCP server çalışırken araç listesi şu endpoint'ten görülebilir:
```
GET http://localhost:8001/sse
```

---

## 7. MCP Protokol Mesajları (JSON-RPC 2.0)

Perde arkasında şu mesajlar geçer:

**Client → Server (araç listesi isteği):**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

**Server → Client (araç listesi yanıtı):**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [{
      "name": "get_current_weather",
      "description": "Belirtilen şehrin anlık hava durumunu döndürür...",
      "inputSchema": {
        "type": "object",
        "properties": {
          "city": {"type": "string", "description": "Şehir adı"}
        }
      }
    }]
  }
}
```

**Client → Server (araç çağrısı):**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "get_current_weather",
    "arguments": {"city": "Antalya"}
  }
}
```

**Server → Client (sonuç):**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [{
      "type": "text",
      "text": "Antalya hava durumu: açık hava, sıcaklık 27°C, nem %45. Öneri: Soğuk içecekler öner."
    }]
  }
}
```

---

## 8. MCP'nin Sağladığı Değer (Önceki vs Sonraki)

### Önceki Durum (MCP Olmadan)

```
recommendation_node
    └── hava durumu YOK
        └── CrewAI → genel öneri (mevsim bağımsız)
```

- Hava durumu verisi sisteme entegre değildi
- Yaz ortasında da sıcak çorba önerebiliyordu
- Öneri kalitesi kullanıcı bağlamıyla sınırlıydı

### MCP Sonrası

```
recommendation_node
    ├── MCP Client → MCP Server → OpenWeatherMap → 27°C, açık hava
    └── CrewAI → hava durumuna uygun öneri (soğuk içecekler, hafif salata)
```

- Gerçek zamanlı hava durumu önerileri etkiliyor
- MCP server değişse (farklı hava servisi) — node kodu değişmez
- İleride farklı node'lar da aynı server'a bağlanabilir

---

## 9. Konfigürasyon (`.env`)

```env
# MCP Server
OPENWEATHER_API_KEY=<openweathermap-api-key>
CAMPUS_CITY=Antalya
MCP_SERVER_URL=http://localhost:8001/sse
```

---

## 10. Bağımlılıklar (`pyproject.toml`)

```toml
"mcp[cli]>=1.3.0",              # MCP server (FastMCP)
"langchain-mcp-adapters>=0.1.0", # LangGraph için MCP client
```

---

## 11. Proje Dosya Yapısı

```
campuscafe-draft/
├── ai_service/
│   ├── mcp_server.py                    ← MCP Server (hava durumu aracı)
│   ├── pyproject.toml                   ← MCP bağımlılıkları
│   ├── .env                             ← API anahtarları ve MCP URL
│   └── src/campuscafe_crew/
│       ├── api.py                       ← FastAPI endpoints
│       ├── graph.py                     ← LangGraph akış tanımı
│       ├── nodes.py                     ← _get_weather_from_mcp() burada
│       ├── crew.py                      ← CrewAI agent tanımları
│       └── tools/
│           └── custom_tool.py           ← CrewAI araçları (menü, sipariş, stok)
├── backend/                             ← Node.js/Express API
├── frontend/campuscafe-ui/              ← Angular UI
└── docs/
    ├── mcp_report.md                    ← Bu rapor
    └── mcp_implementation_plan.md       ← Teknik plan
```

---

## 12. Özet

CampusCafe projesinde MCP şu şekilde kullanılmaktadır:

1. **`mcp_server.py`** adresinde bağımsız bir MCP server çalışır (port 8001, SSE transport)
2. Bu server `get_current_weather` adında bir araç sunar — OpenWeatherMap API'sinden gerçek zamanlı hava durumu çeker
3. LangGraph'ın `recommendation_node`'u, `langchain-mcp-adapters` kütüphanesi aracılığıyla bu server'a JSON-RPC mesajları göndererek hava durumunu sorgular
4. Dönen hava verisi, CrewAI'nın yemek önerisi üretmesinde bağlam olarak kullanılır
5. MCP server çalışmıyorsa sistem kesintisiz çalışmaya devam eder (graceful fallback)

Bu mimari sayesinde hava durumu servisi **tamamen bağımsız** bir bileşen haline gelmiştir — değiştirilebilir, farklı client'lar tarafından kullanılabilir ve LangGraph akış kodunu etkilemeden güncellenebilir.

---

*GitHub: https://github.com/smhavci/campuscafe-draft*
