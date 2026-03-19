# VedaAI — AI Assessment Creator

A full-stack AI-powered exam paper generator. Teachers define parameters; the system builds structured, section-wise question papers with real-time WebSocket updates, background job processing, and a clean print-ready output.

**Live Demo:** _deploy and add link_  
**Built for:** VedaAI Full Stack Engineering Assignment (Due: 21 March)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                       │
│  Create Form → Zustand Store → WebSocket Client → Paper View    │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP + WebSocket
┌────────────────────────▼────────────────────────────────────────┐
│                      BACKEND (Express + WS)                      │
│  POST /api/assignments → BullMQ Queue → Worker → MongoDB        │
│  GET  /api/assignments/:id → Redis Cache → MongoDB              │
│  WS   /ws?assignmentId=xxx → Real-time push to clients          │
└────────┬─────────────────────────────────────────────────────────┘
         │
┌────────▼────────┐   ┌───────────┐   ┌────────────────────────┐
│    MongoDB       │   │   Redis   │   │   Anthropic Claude API  │
│  Assignments +  │   │  Cache +  │   │  claude-sonnet-4-...   │
│  Results stored │   │  Job state│   │  Structured JSON output │
└─────────────────┘   └───────────┘   └────────────────────────┘
```

### Request Flow

1. Teacher submits form → `POST /api/assignments`
2. Assignment saved to MongoDB with `status: pending`
3. Job added to BullMQ queue (`assessment-generation`)
4. API returns `assignmentId` immediately; frontend navigates to result page
5. Frontend connects WebSocket `ws://host/ws?assignmentId=xxx`
6. Worker picks up job, calls Claude API with structured prompt
7. Worker pushes progress events via WebSocket at each stage (10% → 30% → 80% → 100%)
8. On completion, result saved to MongoDB; Redis cache set for 1 hour
9. Frontend displays structured question paper with difficulty badges

---

## Tech Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Frontend  | Next.js 14, TypeScript, Tailwind CSS    |
| State     | Zustand (with devtools)                 |
| Realtime  | WebSocket (native browser + `ws` server)|
| Backend   | Node.js, Express, TypeScript            |
| Database  | MongoDB + Mongoose                      |
| Cache     | Redis (ioredis)                         |
| Queue     | BullMQ                                  |
| AI        | Anthropic Claude (claude-sonnet-4)      |
| Infra     | Docker + Docker Compose                 |

---

## Project Structure

```
vedaai/
├── backend/
│   ├── src/
│   │   ├── index.ts        # Express server + WebSocket setup
│   │   ├── worker.ts       # BullMQ worker (AI generation)
│   │   ├── routes.ts       # REST API routes
│   │   ├── models.ts       # Mongoose schemas
│   │   ├── ai.ts           # Claude prompt builder + parser
│   │   ├── queue.ts        # BullMQ + Redis connection
│   │   └── websocket.ts    # WS server + client notifier
│   ├── Dockerfile
│   ├── Dockerfile.worker
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── create/page.tsx       # Assignment creation form
│   │   │   ├── result/[id]/page.tsx  # Result + live progress
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   └── QuestionPaper.tsx     # Structured paper display
│   │   ├── store/
│   │   │   └── index.ts              # Zustand store
│   │   ├── lib/
│   │   │   ├── api.ts                # axios + WS helpers
│   │   │   └── validate.ts           # Form validation
│   │   └── types/
│   │       └── index.ts              # Shared TypeScript types
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## Local Setup (without Docker)

### Prerequisites

- Node.js 20+
- MongoDB running on `localhost:27017`
- Redis running on `localhost:6379`
- Anthropic API key

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set your ANTHROPIC_API_KEY

npm install
npm run dev          # starts Express server on :4000
# In a separate terminal:
npm run dev:worker   # starts BullMQ worker
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local if needed

npm install
npm run dev          # starts Next.js on :3000
```

Open [http://localhost:3000](http://localhost:3000)

---

## Local Setup (with Docker)

```bash
cp .env.example .env
# Edit .env — set ANTHROPIC_API_KEY=sk-ant-...

docker compose up --build
```

Services:
- Frontend → http://localhost:3000
- Backend  → http://localhost:4000
- MongoDB  → localhost:27017
- Redis    → localhost:6379

---

## Deployment

### Railway (recommended — supports all services)

1. Push repo to GitHub
2. Create a new Railway project
3. Add services: MongoDB plugin, Redis plugin
4. Deploy `backend/` as a service:
   - Set env vars: `MONGODB_URI`, `REDIS_URL`, `ANTHROPIC_API_KEY`, `FRONTEND_URL`
   - Start command: `npm run start`
5. Deploy `backend/` again as worker service:
   - Start command: `npm run start:worker`
6. Deploy `frontend/` as a service:
   - Set env vars: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`

### Render

Similar approach — create 3 web services (backend, worker, frontend) + MongoDB Atlas + Redis Cloud.

---

## API Reference

### `POST /api/assignments`

Create assignment and queue AI generation.

**Body (multipart/form-data):**
```
title               string   required
subject             string   required
dueDate             string   required (ISO date)
questionTypes       JSON     required (array of strings)
totalQuestions      number   required (1–100)
totalMarks          number   required (positive)
difficulty          string   easy | medium | hard
additionalInstructions string
file                File     optional (PDF or TXT, max 10MB)
```

**Response:**
```json
{ "success": true, "assignmentId": "...", "jobId": "..." }
```

### `GET /api/assignments/:id`

Get assignment with result. Cached in Redis for 1h after completion.

### `POST /api/assignments/:id/regenerate`

Clear result, reset status, re-queue generation job.

### `GET /api/assignments`

List recent 20 assignments (results excluded for performance).

### `WS /ws?assignmentId=:id`

WebSocket events pushed by worker:

```json
{ "type": "connected", "assignmentId": "..." }
{ "type": "progress",  "progress": 30, "message": "Building prompt..." }
{ "type": "completed", "progress": 100, "result": { "sections": [...] } }
{ "type": "failed",    "error": "..." }
```

---

## AI Prompt Strategy

The prompt is built in `backend/src/ai.ts`:

- Passes assignment metadata: subject, question types, count, marks, difficulty
- Instructs Claude to distribute difficulty per level (easy: 60/30/10, medium: 20/60/20, hard: 10/30/60)
- Requests strict JSON output only — no markdown, no preamble
- Response is parsed, validated, and marks are recalculated before storing
- File content (PDF/TXT) is prepended as reference material (first 3000 chars)

Raw AI response is never rendered — always parsed into `Section[]` → `Question[]` typed structures.

---

## Features

- Assignment creation form with full validation (no empty fields, no negative values, future-only dates)
- File upload (PDF parsed via `pdf-parse`, TXT read directly)
- Real-time generation progress via WebSocket with polling fallback every 4 seconds
- Structured output: Section A/B/C with instructions, difficulty badges, marks per question
- Student info fields on paper (Name, Roll Number, Section)
- Answer lines rendered for short/long answer questions
- Print / PDF export via browser print dialog
- Regenerate action resets state and re-queues job
- Redis caching of completed papers (1 hour TTL)
- BullMQ retry logic (3 attempts, exponential backoff)

---

## Approach Notes

**Why BullMQ + Worker separation?**  
AI generation can take 15–30 seconds. Handling it synchronously in the request would time out proxies and block Express. The queue decouples submission from generation, enables retries, and allows scaling workers independently.

**Why WebSocket over polling?**  
WebSocket gives sub-second push updates with no overhead. A polling fallback (every 4s) handles cases where the WS connection drops before the job completes.

**Why Zustand over Redux?**  
The state surface is modest and co-located. Zustand gives typed stores without boilerplate — the `handleWsMessage` action centralises all websocket-to-state updates in one place.

**Structured AI output**  
Asking Claude for JSON-only output and then validating/recalculating marks ensures the frontend never renders raw LLM text. The validator recounts total marks from individual question marks, so display is always accurate even if the model drifts slightly.
# VedaAI
