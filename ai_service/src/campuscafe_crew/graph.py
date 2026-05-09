from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from .nodes import (
    GraphState,
    intent_classifier_node,
    param_extractor_node,
    user_context_node,
    recommendation_node,
    critic_node,
    preorder_node,
    inventory_node,
    campaign_proposal_node,
    campaign_executor_node,
    general_node,
)

# Modül seviyesinde tek checkpointer — thread bazlı konuşma hafızası ve interrupt state'i burada tutulur.
# Production için: SqliteSaver.from_conn_string("checkpoints.db") ile kalıcı hale getirilebilir.
_checkpointer = MemorySaver()


def create_campus_graph():
    """CampusCafe LangGraph akışını oluşturur ve derler.

    Persistence: her thread_id için konuşma state'i saklanır (MemorySaver).
    Human-in-the-Loop: campaign_executor node'undan önce graf durur, sahip onayı beklenir.
    Reflection Loop: recommendation_handler → critic → (retry ≤2 | END)

    Akış:
        intent_classifier
            ├─ general        → general_handler → END
            ├─ recommendation → param_extractor → user_context → recommendation_handler
            │                                                          ↓
            │                                                       critic ──→ END (valid)
            │                                                          ↑──────── (invalid, retry≤2)
            ├─ preorder       → param_extractor → user_context → preorder_handler → END
            ├─ inventory      → param_extractor → inventory_handler → END
            └─ campaign       → param_extractor → campaign_proposal
                                                       ↓ [INTERRUPT — sahip onayı]
                                                  campaign_executor → END
    """
    workflow = StateGraph(GraphState)

    workflow.add_node("intent_classifier", intent_classifier_node)
    workflow.add_node("param_extractor", param_extractor_node)
    workflow.add_node("user_context", user_context_node)
    workflow.add_node("recommendation_handler", recommendation_node)
    workflow.add_node("critic", critic_node)
    workflow.add_node("preorder_handler", preorder_node)
    workflow.add_node("inventory_handler", inventory_node)
    workflow.add_node("campaign_proposal", campaign_proposal_node)
    workflow.add_node("campaign_executor", campaign_executor_node)
    workflow.add_node("general_handler", general_node)

    workflow.set_entry_point("intent_classifier")

    # Adım 1: intent → ilgili dala yönlendir
    workflow.add_conditional_edges(
        "intent_classifier",
        lambda state: state["intent"],
        {
            "general":        "general_handler",
            "recommendation": "param_extractor",
            "preorder":       "param_extractor",
            "inventory":      "param_extractor",
            "campaign":       "param_extractor",
        },
    )

    # Adım 2: müşteri yolları → user_context, sahip yolları → doğrudan handler
    workflow.add_conditional_edges(
        "param_extractor",
        lambda state: state["intent"],
        {
            "recommendation": "user_context",
            "preorder":       "user_context",
            "inventory":      "inventory_handler",
            "campaign":       "campaign_proposal",
        },
    )

    # Adım 3: user_context → doğru müşteri handler'ı
    workflow.add_conditional_edges(
        "user_context",
        lambda state: state["intent"],
        {
            "recommendation": "recommendation_handler",
            "preorder":       "preorder_handler",
        },
    )

    # Kampanya: öneri → [INTERRUPT] → icra
    workflow.add_edge("campaign_proposal", "campaign_executor")

    # Tüm son node'lar END'e bağlı
    # Reflection loop: recommendation → critic → yeniden dene veya bitir
    workflow.add_edge("recommendation_handler", "critic")
    workflow.add_conditional_edges(
        "critic",
        lambda state: "retry" if state.get("critic_feedback") else "end",
        {
            "retry": "recommendation_handler",
            "end":   END,
        },
    )
    workflow.add_edge("preorder_handler", END)
    workflow.add_edge("inventory_handler", END)
    workflow.add_edge("campaign_executor", END)
    workflow.add_edge("general_handler", END)

    return workflow.compile(
        checkpointer=_checkpointer,
        interrupt_before=["campaign_executor"],  # sahip kararını bekle
    )


campus_app = create_campus_graph()
