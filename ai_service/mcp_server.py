"""
CampusCafe MCP Server — Hava Durumu Aracı
==========================================
LangGraph'ın recommendation_node'una gerçek zamanlı hava durumu sağlar.

Çalıştırma:
    python3 ai_service/mcp_server.py

Port: 8001 (FastAPI :8000 ile çakışmaz)
Transport: SSE (HTTP üzerinden — web uygulamasına uygun)
"""

import os
import sys
import requests
from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP

load_dotenv()

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")
CAMPUS_CITY = os.getenv("CAMPUS_CITY", "Ankara")

mcp = FastMCP("campuscafe-weather", port=8001)


@mcp.tool()
def get_current_weather(city: str = "Ankara") -> str:
    """
    Belirtilen şehrin anlık hava durumunu döndürür.
    Sıcaklık, hissedilen sıcaklık, hava açıklaması ve nem içerir.

    Args:
        city: Hava durumu alınacak şehir adı (varsayılan: Ankara).

    Returns:
        Türkçe hava durumu özeti.
    """
    print(f"[MCP] get_current_weather çağrıldı → şehir: {city}", file=sys.stderr)

    if not OPENWEATHER_API_KEY:
        print("[MCP] UYARI: OPENWEATHER_API_KEY bulunamadı", file=sys.stderr)
        return "Hava durumu servisi yapılandırılmamış (API key eksik)."

    try:
        response = requests.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={
                "q": city,
                "appid": OPENWEATHER_API_KEY,
                "units": "metric",
                "lang": "tr",
            },
            timeout=8,
        )
        response.raise_for_status()
        data = response.json()

        temp = round(data["main"]["temp"])
        feels_like = round(data["main"]["feels_like"])
        description = data["weather"][0]["description"]
        humidity = data["main"]["humidity"]
        wind_speed = round(data["wind"]["speed"])

        if temp >= 28:
            tip = "Sıcak hava — soğuk içecekler ve hafif yemekler öner."
        elif temp <= 10:
            tip = "Soğuk hava — sıcak içecekler ve doyurucu yemekler öner."
        elif "yağmur" in description or "yağış" in description:
            tip = "Yağışlı hava — sıcak ve rahatlatıcı seçenekler öner."
        else:
            tip = "Ilıman hava — dengeli öneriler yap."

        result = (
            f"{city} hava durumu: {description}, "
            f"sıcaklık {temp}°C (hissedilen {feels_like}°C), "
            f"nem %{humidity}, rüzgar {wind_speed} km/s. "
            f"Öneri ipucu: {tip}"
        )
        print(f"[MCP] Hava durumu alındı: {result}", file=sys.stderr)
        return result

    except requests.HTTPError as e:
        msg = f"OpenWeatherMap hatası: {e.response.status_code}"
        print(f"[MCP] {msg}", file=sys.stderr)
        return msg
    except requests.RequestException as e:
        msg = f"Hava durumu alınamadı: {e}"
        print(f"[MCP] {msg}", file=sys.stderr)
        return msg


if __name__ == "__main__":
    print("=" * 52, file=sys.stderr)
    print("  CampusCafe MCP Server başlatılıyor", file=sys.stderr)
    print(f"  Şehir: {CAMPUS_CITY}", file=sys.stderr)
    print(f"  API Key: {'✅ Tanımlı' if OPENWEATHER_API_KEY else '❌ Eksik'}", file=sys.stderr)
    print(f"  Adres: http://localhost:8001/sse", file=sys.stderr)
    print("=" * 52, file=sys.stderr)
    mcp.run(transport="sse")
