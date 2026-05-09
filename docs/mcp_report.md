# CampusCafe — MCP (Model Context Protocol) Integration Report

**GitHub:** https://github.com/smhavci/campuscafe-draft

---

## 1. Project Overview

CampusCafe is a full-stack application built for university cafeteria management. It consists of an Angular-based user interface, a Node.js/Express backend, an SQLite database, and an AI module. The AI module combines three technologies: **LangGraph** (orchestration), **CrewAI** (agent management), and **MCP** (tool protocol).

---

## 2. What is MCP (Model Context Protocol)?

**Model Context Protocol (MCP)** is an open standard published by Anthropic in 2024. It enables AI models to connect to external data sources and tools through a **standard protocol** (JSON-RPC 2.0).

### Core Idea

Before MCP, every AI application defined its tools in its own proprietary way. MCP solves this problem with one principle:

> **"Tool definition must be separated from tool use."**

```
Traditional Approach:
   AI Model  ←→  Application code (tool embedded here)

With MCP:
   AI Model  →  MCP Client  →  MCP Server  →  Actual tool
```

### Benefits of MCP

| Feature | Traditional | MCP |
|---|---|---|
| Tool sharing | Same framework only | Any MCP-compatible client |
| Protocol | Each app differs | JSON-RPC 2.0 standard |
| Decoupling | Tool is embedded in code | Server runs independently |
| Transport | None (in-process) | stdio / SSE / HTTP |

---

## 3. MCP Architecture in the CampusCafe Project

### 3.1 Data Flow

```
User (Angular UI)
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

### 3.2 Role of MCP in the Project

When a user asks for a food recommendation, the system does the following:

1. **LangGraph** routes the request to `recommendation_node`
2. The node connects to the MCP server via the **MCP client** (`langchain-mcp-adapters`)
3. The MCP server executes the `get_current_weather` tool → fetches data from OpenWeatherMap
4. Weather data (temperature, humidity, description) is returned to the node
5. **CrewAI** generates a personalized food recommendation that accounts for the current weather

---

## 4. Code Walkthrough

### 4.1 MCP Server (`ai_service/mcp_server.py`)

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("campuscafe-weather", port=8001)

@mcp.tool()
def get_current_weather(city: str = "Ankara") -> str:
    """Returns current weather — temperature, humidity, wind, and a recommendation tip."""
    response = requests.get(
        "https://api.openweathermap.org/data/2.5/weather",
        params={"q": city, "appid": API_KEY, "units": "metric", "lang": "tr"},
    )
    data = response.json()
    temp = round(data["main"]["temp"])

    if temp >= 28:
        tip = "Hot weather — recommend cold drinks and light meals."
    elif temp <= 10:
        tip = "Cold weather — recommend hot drinks and hearty meals."
    else:
        tip = "Mild weather — recommend balanced options."

    return f"{city}: {data['weather'][0]['description']}, {temp}°C. Tip: {tip}"

if __name__ == "__main__":
    mcp.run(transport="sse")   # HTTP/SSE — suitable for web applications
```

**Key points:**
- The `@mcp.tool()` decorator automatically converts the function into a JSON-RPC tool
- `transport="sse"` is chosen because this is a web application (not a CLI tool)
- Port `8001` does not conflict with FastAPI on port `8000`
- The server generates a weather-based recommendation tip automatically

### 4.2 MCP Client on the LangGraph Side (`ai_service/src/campuscafe_crew/nodes.py`)

```python
from langchain_mcp_adapters.client import MultiServerMCPClient

async def _get_weather_from_mcp() -> str:
    """Fetches live weather from the MCP server.
    Returns an empty string gracefully if the server is unavailable.
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
        print(f"⚠️  MCP connection failed ({e}) — continuing without weather")
        return ""
```

**Key points:**
- `MultiServerMCPClient`: supports multiple MCP servers simultaneously (extensible)
- `client.get_tools()`: fetches the available tool list from the server via JSON-RPC
- `ainvoke`: async call — compatible with LangGraph's async execution model
- `try/except`: if the MCP server is down, the system continues without crashing

### 4.3 Integration Inside `recommendation_node`

```python
async def recommendation_node(state: GraphState) -> dict:
    # Fetch weather from MCP
    weather_context = await _get_weather_from_mcp()

    # CrewAI receives both user order history and live weather
    crew = CampusCafeCrew().recommendation_crew()
    result = crew.kickoff(inputs={
        "budget":              str(params.get("budget") or "not specified"),
        "dietary_preferences": params.get("dietary_preferences") or "none",
        "user_history":        state.get("user_context"),
        "user_input":          user_input,
        "weather_context":     weather_context or "Weather data unavailable.",
    })
```

---

## 5. Transport Selection: stdio vs SSE

| | stdio | SSE (HTTP) |
|---|---|---|
| How it works | Subprocess stdin/stdout | HTTP GET /sse stream |
| Best suited for | Claude Desktop, CLI tools | Web applications |
| Multiple clients | No | Yes |
| In this project | Not suitable | **Selected** |

CampusCafe is a web application, so SSE transport was chosen. The MCP server runs at `http://localhost:8001/sse`; both LangGraph and any future client can connect simultaneously.

---

## 6. Running & Live Demo

### Step 1: Start the MCP Server

```bash
cd ai_service
python3 mcp_server.py
```

Expected output:
```
====================================================
  CampusCafe MCP Server starting
  City: Antalya
  API Key: ✅ Defined
  Address: http://localhost:8001/sse
====================================================
```

### Step 2: Start the AI Service

```bash
cd ai_service
uvicorn src.campuscafe_crew.api:app --port 8000
```

### Step 3: Ask the Chatbot for a Food Recommendation

User types in the chatbot: _"What should I eat today, my budget is 80 TL"_

The terminal shows the following sequence:

```
[LangGraph] ▶ intent_classifier
[LangGraph]   Message: What should I eat today, my budget is 80 TL
[LangGraph]   Intent → RECOMMENDATION
[LangGraph] ▶ param_extractor
[LangGraph]   Parameters → {"budget": 80, ...}
[LangGraph] ▶ user_context  (fetching order history)
[LangGraph] ▶ recommendation_handler  (CrewAI + MCP activated)
[MCP] get_current_weather called → city: Antalya
[MCP] Weather received: Antalya: clear sky, 27°C... Recommend cold drinks.
🌤️  MCP weather: Antalya: clear sky, 27°C...
```

---

## 7. MCP Protocol Messages (JSON-RPC 2.0)

These are the actual messages exchanged behind the scenes:

**Client → Server (list tools request):**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

**Server → Client (tool list response):**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [{
      "name": "get_current_weather",
      "description": "Returns the current weather for a given city...",
      "inputSchema": {
        "type": "object",
        "properties": {
          "city": {"type": "string", "description": "City name"}
        }
      }
    }]
  }
}
```

**Client → Server (tool call):**
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

**Server → Client (result):**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [{
      "type": "text",
      "text": "Antalya: clear sky, temperature 27°C, humidity 45%. Tip: Recommend cold drinks and light meals."
    }]
  }
}
```

---

## 8. Before vs. After MCP

### Before (without MCP)

```
recommendation_node
    └── NO weather data
        └── CrewAI → generic recommendation (season-agnostic)
```

- Weather was not integrated into the system
- The AI could recommend hot soup in the middle of summer
- Recommendation quality was limited to user history alone

### After MCP

```
recommendation_node
    ├── MCP Client → MCP Server → OpenWeatherMap → 27°C, clear sky
    └── CrewAI → weather-aware recommendation (cold drinks, light salad)
```

- Real-time weather now influences every food recommendation
- If the MCP server changes (different weather provider) — node code stays the same
- Other nodes can connect to the same server in the future without any changes

---

## 9. Configuration (`.env`)

```env
# MCP Server
OPENWEATHER_API_KEY=<openweathermap-api-key>
CAMPUS_CITY=Antalya
MCP_SERVER_URL=http://localhost:8001/sse
```

---

## 10. Dependencies (`pyproject.toml`)

```toml
"mcp[cli]>=1.3.0",               # MCP server (FastMCP)
"langchain-mcp-adapters>=0.1.0",  # MCP client for LangGraph
```

---

## 11. Project File Structure

```
campuscafe-draft/
├── ai_service/
│   ├── mcp_server.py                    ← MCP Server (weather tool)
│   ├── pyproject.toml                   ← MCP dependencies
│   ├── .env                             ← API keys and MCP URL
│   └── src/campuscafe_crew/
│       ├── api.py                       ← FastAPI endpoints
│       ├── graph.py                     ← LangGraph flow definition
│       ├── nodes.py                     ← _get_weather_from_mcp() lives here
│       ├── crew.py                      ← CrewAI agent definitions
│       └── tools/
│           └── custom_tool.py           ← CrewAI tools (menu, orders, inventory)
├── backend/                             ← Node.js/Express API
├── frontend/campuscafe-ui/              ← Angular UI
└── docs/
    ├── mcp_report.md                    ← This report
    └── mcp_implementation_plan.md       ← Technical design notes
```

---

## 12. Summary

MCP is used in the CampusCafe project as follows:

1. An independent MCP server runs at `mcp_server.py` (port 8001, SSE transport)
2. This server exposes a tool called `get_current_weather` — it fetches live weather data from the OpenWeatherMap API
3. LangGraph's `recommendation_node` sends JSON-RPC messages to this server via the `langchain-mcp-adapters` library to query the current weather
4. The returned weather data is passed as context to CrewAI, which uses it when generating food recommendations
5. If the MCP server is unavailable, the system continues operating without interruption (graceful fallback)

This architecture makes the weather service a **fully independent component** — it can be swapped out, used by multiple clients, and updated without touching the LangGraph flow code.

---

*GitHub: https://github.com/smhavci/campuscafe-draft*
