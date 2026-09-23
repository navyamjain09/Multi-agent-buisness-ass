# Northstar: Azure AI Foundry business assistant

Northstar is a starter multi-agent business assistant. A lightweight router sends each request to a finance, operations, sales, research, or general business specialist. It runs locally in demo mode and can call deployed Azure AI Foundry agents with Microsoft Entra ID.

## Run locally

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Open http://127.0.0.1:8000.

## Connect Azure

Set `DEMO_MODE=false` in `.env`, then configure:

- `AZURE_AI_PROJECT_ENDPOINT`: your Azure AI Foundry project endpoint
- `AZURE_AI_MODEL_DEPLOYMENT`: the model deployment name
- `FOUNDRY_*_AGENT`: the names of deployed agents in your Foundry project

The app uses `DefaultAzureCredential`, so local development can authenticate through Azure CLI (`az login`) and production can use a managed identity. Each request is sent through the Foundry Responses endpoint with an `agent_reference`, keeping the `/api/chat` contract unchanged. If `AZURE_AI_PROJECT_ENDPOINT` is not set, the app can still use the optional Azure OpenAI key-based fallback.

## Suggested Azure services

- Azure AI Foundry Agent Service for specialist and supervisor agents
- Azure AI Search for grounded company knowledge
- Azure Blob Storage for source documents
- Azure Content Safety for input/output moderation
- Application Insights and Azure Monitor for tracing, latency, and cost
- Microsoft Entra ID and managed identities for production authentication

## Project shape

- `app/agents.py`: routing, specialist profiles, and Azure model integration
- `app/main.py`: FastAPI endpoints
- `static/`: responsive command-center UI
- `.env.example`: local configuration contract
