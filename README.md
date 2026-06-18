# Cross-Collaborative-AI-Platform

A self-healing, multi-agent travel planning platform built with TypeScript, Node.js, Express, and React. The platform leverages a sequential token-passing orchestration architecture to process complex travel queries across specialized agents, featuring a real-time failover pipeline that dynamically switches LLM providers when encountering rate limits or API disruptions.

## 🚀 Local Installation & Setup

### Prerequisites

* **Node.js:** version `v18+` must be installed on your machine.

### 1. Clone the Repository

```bash
git clone GIT_REPO
cd REPO_NAME

```

### 2. Configure Environment Variables

#### Backend Configuration

Navigate to the `backend` folder and create a `.env` file:

```bash
cd backend
touch .env

```

Populate `backend/.env` with your credentials:

```env
PORT=3001
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
NODE_ENV=development

```

#### Frontend Configuration

Navigate to the `frontend` folder and create a `.env.development` file:

```bash
cd ../frontend
touch .env.development

```

Populate `frontend/.env.development` with the local API target route:

```env
VITE_API_URL=http://localhost:3001

```

---

## 🏃‍♂️ Running the Platform Locally

> 💡 **Note:** You will need two separate terminal windows open to execute both services simultaneously.

### Start the Backend Engine

Open your first terminal and run:

```bash
cd backend
npm install
npm run build
npm start

```

*Your backend will compile TypeScript into native JavaScript inside the `/dist` directory and spin up live on `http://localhost:3001`.*

### Start the Frontend UI

Open your second terminal and run:

```bash
cd frontend
npm install
npm run dev
```

*Your interface will boot up instantly, typically accessible at `http://localhost:5173`.*

---

## 🏗️ System Architecture

The application is structured as a monorepo splitting logic across an independent frontend user interface and a decoupled backend orchestration engine.


```markdown
[ Client Frontend UI (Netlify) ]
               │
               ▼ (Secure HTTP API Requests)
[ Core Orchestrator Engine (Render Web Service) ]
       │
       ├── 1. Intent Router Agent ───┐
       ├── 2. Itinerary Planner ─────┼───► Primary Context: Gemini 2.5 Flash
       ├── 3. Budget Optimizer ──────┤     (Dynamic Failover: Groq / Llama 3)
       └── 4. Synthesis Agent ───────┘
               │
               ▼
   [ SQLite Local Volume Audit Log ]

```

### 🔑 Key Architectural Pillars

* **Linear Token-Passing Chaining:** Each specialized agent inputs a shared context object, injects its domain-specific analysis, and forwards it to the next agent down the pipeline.
* **Dynamic LLM Failover:** To defend against runtime API drops, the engine monitors error boundaries across every step. If the Gemini SDK throws a `429` (Rate Limit) or network exception, the context state hot-swaps to the Groq API pipeline seamlessly.
* **Decoupled Audit Ledger:** State persistence and architectural execution traces are handled via a local SQLite driver (`better-sqlite3`), capturing raw inputs, prompt configurations, and system tokens without choking agent runtimes.

---

## 🛠️ Tech Stack

| Component | Technologies Used | Deployment Platform |
| --- | --- | --- |
| **Frontend** | React, TypeScript, TailwindCSS, Lucide Icons, Vite | Netlify |
| **Backend** | Node.js, Express, TypeScript, `@google/genai`, `groq-sdk` | Render |
| **Database** | SQLite via `better-sqlite3` | Persistent Container Disk Volume |

---
