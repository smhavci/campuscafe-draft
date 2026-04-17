from langgraph.graph import StateGraph, END
from .nodes import GraphState, router_node, user_context_node, crewai_node, general_node


def create_campus_graph():
    """CampusCafe LangGraph akışını oluşturur ve derler.

    Akış:
        router → (crewai path) user_context → crewai_handler → END
               → (general path) general_handler → END
    """
    workflow = StateGraph(GraphState)

    # Düğümleri ekle
    workflow.add_node("router", router_node)
    workflow.add_node("user_context", user_context_node)
    workflow.add_node("crewai_handler", crewai_node)
    workflow.add_node("general_handler", general_node)

    # Başlangıç noktası
    workflow.set_entry_point("router")

    # Router'dan koşullu geçiş
    workflow.add_conditional_edges(
        "router",
        lambda state: state["next_step"],
        {
            "crewai": "user_context",    # önce kullanıcı geçmişini çek
            "general": "general_handler"
        }
    )

    # user_context → crewai_handler (geçmiş hazır, öneri üret)
    workflow.add_edge("user_context", "crewai_handler")

    # Bitiş
    workflow.add_edge("crewai_handler", END)
    workflow.add_edge("general_handler", END)

    return workflow.compile()


campus_app = create_campus_graph()
