from typing import TypedDict, Annotated, List, Union
from datetime import datetime
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from campuscafe_crew.crew import CampusCafeCrew

class GraphState(TypedDict):
    """LangGraph durumunu temsil eden yapı."""
    messages: List[BaseMessage]
    next_step: str
    final_response: str

def router_node(state: GraphState):
    """Kullanıcı isteğinin türüne karar veren yönlendirici düğüm."""
    llm = ChatOpenAI(model="gpt-4o-mini")
    
    last_message = state["messages"][-1].content
    
    prompt = f"""
    Sen CampusCafe'in akıllı yönlendiricisisin. 
    Aşağıdaki kullanıcı isteğini analiz et ve şu iki kategoriden birine ata:
    1. 'crewai': Eğer istek yemek tavsiyesi, bütçe planlaması, sipariş tahmini veya stok/kampanya ile ilgiliyse.
    2. 'general': Eğer istek selamlaşma, genel sohbet veya sistemle ilgili basit bir soruysa.

    Sadece kategoriyi (crewai veya general) döndür.
    
    İstek: {last_message}
    """
    
    response = llm.invoke(prompt).content.strip().lower()
    
    return {"next_step": response if response in ["crewai", "general"] else "general"}

def crewai_node(state: GraphState):
    """Karmaşık görevler için CrewAI ekiplerini çağıran düğüm."""
    last_message = state["messages"][-1].content

    crew = CampusCafeCrew().recommendation_crew()
    result = crew.kickoff(inputs={
        "budget": "orta",
        "dietary_preferences": "yok",
        "time_of_day": datetime.now().strftime("%H:%M"),
        "user_input": last_message,
    })

    return {"final_response": str(result)}

def general_node(state: GraphState):
    """Genel sohbet isteklerini yanıtlayan düğüm."""
    llm = ChatOpenAI(model="gpt-4o-mini")
    
    last_message = state["messages"][-1].content
    response = llm.invoke(f"Sen CampusCafe asistanısın. Bu mesajı nazikçe yanıtla: {last_message}")
    
    return {"final_response": response.content}
