"""
CampusCafe AI Crew Definition.
Defines the crew with agents and tasks loaded from YAML configuration.
"""

from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task

from .tools.custom_tool import (
    MenuSearchTool,
    OrderHistoryTool,
    CampaignCreatorTool,
    InventoryCheckerTool,
)


@CrewBase
class CampusCafeCrew:
    """CampusCafe AI Crew - Multi-agent system for campus dining management."""

    agents_config = "config/agents.yaml"
    tasks_config = "config/tasks.yaml"

    # --------------------------------------------------------
    # Agents
    # --------------------------------------------------------
    @agent
    def budget_health_advisor(self) -> Agent:
        return Agent(
            config=self.agents_config["budget_health_advisor"],
            tools=[MenuSearchTool()],
            verbose=True,
        )

    @agent
    def preorder_predictor(self) -> Agent:
        return Agent(
            config=self.agents_config["preorder_predictor"],
            tools=[MenuSearchTool(), OrderHistoryTool()],
            verbose=True,
        )

    @agent
    def inventory_trend_monitor(self) -> Agent:
        return Agent(
            config=self.agents_config["inventory_trend_monitor"],
            tools=[InventoryCheckerTool()],
            verbose=True,
        )

    @agent
    def campaign_manager(self) -> Agent:
        return Agent(
            config=self.agents_config["campaign_manager"],
            tools=[InventoryCheckerTool(), CampaignCreatorTool()],
            verbose=True,
        )

    # --------------------------------------------------------
    # Tasks
    # --------------------------------------------------------
    @task
    def recommend_meal_task(self) -> Task:
        return Task(
            config=self.tasks_config["recommend_meal_task"],
        )

    @task
    def predict_preorder_task(self) -> Task:
        return Task(
            config=self.tasks_config["predict_preorder_task"],
        )

    @task
    def monitor_inventory_task(self) -> Task:
        return Task(
            config=self.tasks_config["monitor_inventory_task"],
        )

    @task
    def create_campaign_task(self) -> Task:
        return Task(
            config=self.tasks_config["create_campaign_task"],
        )

    # --------------------------------------------------------
    # Specialized Crews (one per feature to avoid input conflicts)
    # --------------------------------------------------------
    def recommendation_crew(self) -> Crew:
        """Crew for meal recommendation requests."""
        return Crew(
            agents=[self.budget_health_advisor()],
            tasks=[self.recommend_meal_task()],
            process=Process.sequential,
            verbose=True,
        )

    def preorder_crew(self) -> Crew:
        """Crew for pre-order prediction requests."""
        return Crew(
            agents=[self.preorder_predictor()],
            tasks=[self.predict_preorder_task()],
            process=Process.sequential,
            verbose=True,
        )

    def inventory_crew(self) -> Crew:
        """Crew for inventory monitoring requests."""
        return Crew(
            agents=[self.inventory_trend_monitor()],
            tasks=[self.monitor_inventory_task()],
            process=Process.sequential,
            verbose=True,
        )

    def campaign_crew(self) -> Crew:
        """Crew for campaign creation requests."""
        return Crew(
            agents=[self.campaign_manager()],
            tasks=[self.create_campaign_task()],
            process=Process.sequential,
            verbose=True,
        )

    @crew
    def crew(self) -> Crew:
        """Full crew - runs all tasks sequentially (for testing only)."""
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True,
        )
