from dataclasses import dataclass
import os

from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential
from openai import AzureOpenAI

from .models import AgentName, AgentResponse


@dataclass(frozen=True)
class AgentProfile:
    name: AgentName
    label: str
    description: str
    foundry_name: str


AGENTS: dict[AgentName, AgentProfile] = {
    "finance": AgentProfile(
        "finance",
        "Finance analyst",
        "Budgeting, margins, forecasts, and financial risk",
        os.getenv("FOUNDRY_FINANCE_AGENT", "finance-analyst"),
    ),
    "operations": AgentProfile(
        "operations",
        "Operations planner",
        "Processes, capacity, vendors, and delivery",
        os.getenv("FOUNDRY_OPERATIONS_AGENT", "operations-planner"),
    ),
    "sales": AgentProfile(
        "sales",
        "Sales strategist",
        "Pipeline, accounts, pricing, and customer growth",
        os.getenv("FOUNDRY_SALES_AGENT", "sales-strategist"),
    ),
    "research": AgentProfile(
        "research",
        "Market researcher",
        "Competitors, trends, customers, and opportunities",
        os.getenv("FOUNDRY_RESEARCH_AGENT", "market-researcher"),
    ),
    "general": AgentProfile(
        "general",
        "Business lead",
        "Cross-functional synthesis and prioritization",
        os.getenv("FOUNDRY_BUSINESS_LEAD_AGENT", "business-lead"),
    ),
}


class BusinessOrchestrator:
    def __init__(self) -> None:
        # Default to Azure/Foundry mode rather than demo mode.
        self.demo_mode = (
            os.getenv("DEMO_MODE", "false").strip().lower() == "true"
        )

        self.project_client = self._create_project_client()
        self.client = self._create_azure_openai_client()

        # Temporary diagnostics.
        # Remove these after the Foundry connection is confirmed.
        print("===== FOUNDRY CONFIG =====")
        print("DEMO_MODE:", self.demo_mode)
        print(
            "AZURE_AI_PROJECT_ENDPOINT:",
            os.getenv("AZURE_AI_PROJECT_ENDPOINT"),
        )
        print(
            "AZURE_AI_MODEL_DEPLOYMENT:",
            os.getenv("AZURE_AI_MODEL_DEPLOYMENT"),
        )
        print(
            "PROJECT CLIENT CREATED:",
            self.project_client is not None,
        )
        print("==========================")

    def _create_project_client(self) -> AIProjectClient | None:
        endpoint = os.getenv("AZURE_AI_PROJECT_ENDPOINT")

        if self.demo_mode or not endpoint:
            return None

        return AIProjectClient(
            endpoint=endpoint,
            credential=DefaultAzureCredential(),
        )

    def _create_azure_openai_client(self) -> AzureOpenAI | None:
        endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        api_key = os.getenv("AZURE_OPENAI_API_KEY")
        api_version = os.getenv(
            "AZURE_OPENAI_API_VERSION",
            "2024-10-21",
        )

        # If Foundry project client exists, use Foundry instead.
        if (
            self.demo_mode
            or self.project_client
            or not endpoint
            or not api_key
        ):
            return None

        return AzureOpenAI(
            azure_endpoint=endpoint,
            api_key=api_key,
            api_version=api_version,
        )

    def route(self, message: str) -> AgentName:
        text = message.lower()

        keywords: dict[AgentName, tuple[str, ...]] = {
            "finance": (
                "budget",
                "cash",
                "margin",
                "cost",
                "revenue",
                "forecast",
                "profit",
                "financial",
                "finance",
                "expense",
                "profitability",
            ),
            "operations": (
                "process",
                "capacity",
                "vendor",
                "inventory",
                "delivery",
                "workflow",
                "hire",
                "operations",
                "operational",
                "supply",
            ),
            "sales": (
                "sales",
                "pipeline",
                "account",
                "customer",
                "deal",
                "pricing",
                "churn",
                "conversion",
                "retention",
            ),
            "research": (
                "market",
                "competitor",
                "trend",
                "industry",
                "research",
                "opportunity",
                "competition",
            ),
        }

        scores = {
            name: sum(word in text for word in words)
            for name, words in keywords.items()
        }

        best_agent, best_score = max(
            scores.items(),
            key=lambda item: item[1],
        )

        return best_agent if best_score else "general"

    def respond(self, message: str) -> AgentResponse:
        agent = self.route(message)
        profile = AGENTS[agent]

        # ============================================================
        # AZURE AI FOUNDRY
        # ============================================================
        if self.project_client:
            try:
                with self.project_client.get_openai_client() as client:
                    response = client.responses.create(
                        model=os.getenv(
                            "AZURE_AI_MODEL_DEPLOYMENT",
                            "gpt-5-mini",
                        ),
                        input=message,
                        extra_body={
                            "agent_reference": {
                                "name": profile.foundry_name,
                                "type": "agent_reference",
                            }
                        },
                    )

                answer = (
                    response.output_text
                    or "I could not produce an answer."
                )

                return AgentResponse(
                    agent=agent,
                    answer=answer,
                    next_steps=self._next_steps(agent),
                    demo_mode=False,
                )

            except Exception as exc:
                # Print the actual Foundry error in the backend terminal.
                print("===== FOUNDRY ERROR =====")
                print(type(exc).__name__)
                print(str(exc))
                print("=========================")

                return AgentResponse(
                    agent=agent,
                    answer=(
                        "I could not connect to the Azure AI Foundry "
                        "agent. Please check the backend terminal for "
                        "the detailed error."
                    ),
                    next_steps=[
                        "Check the Azure AI Foundry project endpoint",
                        "Check Azure authentication",
                        "Check that the selected Foundry agent is running",
                    ],
                    sources=[],
                    demo_mode=False,
                )

        # ============================================================
        # LEGACY AZURE OPENAI FALLBACK
        # ============================================================
        if self.client:
            response = self.client.chat.completions.create(
                model=os.getenv(
                    "AZURE_AI_MODEL_DEPLOYMENT",
                    "gpt-5-mini",
                ),
                temperature=0.2,
                messages=[
                    {
                        "role": "system",
                        "content": self._system_prompt(profile),
                    },
                    {
                        "role": "user",
                        "content": message,
                    },
                ],
            )

            answer = (
                response.choices[0].message.content
                or "I could not produce an answer."
            )

            return AgentResponse(
                agent=agent,
                answer=answer,
                next_steps=self._next_steps(agent),
                demo_mode=False,
            )

        # ============================================================
        # DEMO MODE
        # ============================================================
        return AgentResponse(
            agent=agent,
            answer=(
                f"{profile.label} selected. "
                f"In Azure mode, the {profile.foundry_name} agent "
                f"will analyze this request with its connected "
                f"business data.\n\n"
                f"For now, I would frame the request as: {message}"
            ),
            next_steps=self._next_steps(agent),
            sources=[
                "Demo response: connect Azure AI Foundry "
                "and Azure AI Search for grounded answers."
            ],
            demo_mode=True,
        )

    @staticmethod
    def _system_prompt(profile: AgentProfile) -> str:
        return (
            f"You are the {profile.label} in a multi-agent "
            f"business assistant. "
            f"Your specialty is {profile.description}.\n"
            "Be concise and practical. "
            "State assumptions, quantify impact when possible, "
            "flag uncertainty, and end with 2-4 concrete next steps. "
            "You are one specialist in a larger orchestration system; "
            "do not claim to have accessed data unless it is included "
            "in the prompt."
        )

    @staticmethod
    def _next_steps(agent: AgentName) -> list[str]:
        return {
            "finance": [
                "Confirm the planning period and currency",
                "Attach the latest P&L or budget export",
                "Review assumptions with the finance owner",
            ],
            "operations": [
                "Identify the process owner",
                "Measure current volume, cycle time, and constraints",
                "Pilot the highest-impact change",
            ],
            "sales": [
                "Define the target segment",
                "Add CRM pipeline data",
                "Agree on one conversion or retention metric",
            ],
            "research": [
                "Specify geography and customer segment",
                "Connect approved web or knowledge sources",
                "Turn findings into a scored opportunity list",
            ],
            "general": [
                "Clarify the desired business outcome",
                "Share the relevant source documents",
                "Choose an owner and due date",
            ],
        }[agent]