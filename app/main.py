from pathlib import Path

from dotenv import load_dotenv

# Load environment variables before importing the application modules.
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .agents import AGENTS, BusinessOrchestrator
from .models import ChatRequest, HealthResponse


app = FastAPI(
    title="Foundry Business Assistant",
    version="0.1.0",
)

app.mount(
    "/static",
    StaticFiles(directory=BASE_DIR / "static"),
    name="static",
)

orchestrator = BusinessOrchestrator()


@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    return FileResponse(BASE_DIR / "static" / "index.html")


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        demo_mode=orchestrator.demo_mode,
        configured_agents=[agent.name for agent in AGENTS.values()],
    )


@app.post("/api/chat")
def chat(request: ChatRequest):
    return orchestrator.respond(request.message)