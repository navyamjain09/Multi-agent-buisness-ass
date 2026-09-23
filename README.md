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


The app uses `DefaultAzureCredential`, so local development can authenticate through Azure CLI (`az login`) and production can use a managed identity. Each request is sent through the Foundry Responses endpoint with an `agent_reference`, keeping the `/api/chat` contract unchanged. If `AZURE_AI_PROJECT_ENDPOINT` is not set, the app can still use the optional Azure OpenAI key-based fallback.

## Suggested Azure services


## Project shape


# AgentGrid

AgentGrid is a multi-agent business assistant built with React, FastAPI, and Azure AI Foundry. It routes business questions to specialist agents for finance, operations, sales, market research, or cross-functional planning.

## Features

- Interactive React dashboard with Overview, New Brief, Knowledge, Profile, and Brief History views
- Browser-local brief history with filters and click-to-reopen questions
- FastAPI backend with a stable `/api/chat` contract
- Azure AI Foundry Responses API integration using Microsoft Entra ID
- Demo mode for local UI development without Azure credentials
- Docker and Azure App Service deployment support

## Project structure

```text
.
├── app/                 # FastAPI backend and agent orchestration
├── src/                 # React source components and styles
├── static/              # Production React build served by FastAPI
├── index.html           # Vite entry point
├── Dockerfile           # Container deployment
├── startup.sh           # Azure App Service startup command
├── requirements.txt     # Python dependencies
├── package.json         # React/Vite scripts
└── .env.example         # Azure configuration template
```

## Run locally

### Backend and production frontend

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
npm install
npm run build
cp .env.example .env
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000.

### React development mode

Run the API in one terminal:

```bash
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Run Vite in another terminal:

```bash
npm run dev
```

Vite proxies `/api` requests to the FastAPI server.

## Configure Azure AI Foundry

Authenticate locally:

```bash
az login
```

Set `DEMO_MODE=false` in `.env`, then configure:

```env
AZURE_AI_PROJECT_ENDPOINT=https://<resource>.services.ai.azure.com/api/projects/<project>
AZURE_AI_MODEL_DEPLOYMENT=<model-deployment-name>
FOUNDRY_FINANCE_AGENT=finance-analyst
FOUNDRY_OPERATIONS_AGENT=operations-planner
FOUNDRY_SALES_AGENT=sales-strategist
FOUNDRY_RESEARCH_AGENT=market-researcher
FOUNDRY_BUSINESS_LEAD_AGENT=business-lead
```

Create these prompt agents in your Foundry project, or change the names above to match your deployed agents. The application uses `DefaultAzureCredential`, so local development can use Azure CLI authentication and Azure hosting can use a managed identity.

## API

Health check:

```bash
curl http://127.0.0.1:8000/api/health
```

Chat request:

```bash
curl -X POST http://127.0.0.1:8000/api/chat \
	-H 'Content-Type: application/json' \
	-d '{"message":"How can we reduce operating costs?"}'
```

## Deploy

### Azure App Service

Build the React frontend, create a Linux Python App Service, deploy the repository, and configure the startup command from `startup.sh`:

```bash
npm install
npm run build
az webapp up --name <unique-app-name> --resource-group <resource-group> --runtime 'PYTHON:3.12' --location <azure-region>
az webapp config set --name <unique-app-name> --resource-group <resource-group> --startup-file startup.sh
```

Set the Azure AI Foundry variables as App Service application settings. Use a managed identity and grant it access to the Foundry project rather than placing credentials in the repository.

### Docker

```bash
docker build -t agentgrid .
docker run --env-file .env -p 8000:8000 agentgrid
```

The Dockerfile builds React and runs FastAPI with Gunicorn. It deliberately excludes `.env`, `node_modules`, and `.venv` from the image context.

## Azure services to add for production

- Azure AI Foundry Agent Service for specialist agents
- Azure AI Search and Blob Storage for grounded company knowledge
- Azure Content Safety for moderation and prompt-injection defenses
- Application Insights and Azure Monitor for tracing, latency, and cost
- Microsoft Entra ID and managed identities for authentication

## Security

Never commit `.env` or API keys. The repository ignores `.env` by default. Prefer Microsoft Entra ID and managed identities for deployed environments.
