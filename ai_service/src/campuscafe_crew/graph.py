from langgraph.graph import StateGraph, END
from .nodes import GraphState, router_node, crewai_node, general_node

def create_campus_graph():
    """CampusCafe LangGraph akışını oluşturur ve derler."""
    
    # 1. Grafiği tanımla
    workflow = StateGraph(GraphState)
    
    # 2. Düğümleri (Nodes) ekle
    workflow.add_node("router", router_node)
    workflow.add_node("crewai_handler", crewai_node)
    workflow.add_node("general_handler", general_node)
    
    # 3. Akış Mantığını (Edges) kur
    workflow.set_entry_point("router")
    
    # Koşullu geçişler (Conditional Edges)
    workflow.add_conditional_edges(
        "router",
        lambda x: x["next_step"],
        {
            "crewai": "crewai_handler",
            "general": "general_handler"
        }
    )
    
    # Bitiş geçişleri
    workflow.add_edge("crewai_handler", END)
    workflow.add_edge("general_handler", END)
    
    # 4. Derle
    return workflow.compile()

# Kullanım için hazır uygulama nesnesi
campus_app = create_campus_graph()
