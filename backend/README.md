# Backend Service (NestJS)

This service handles orchestration, validation, Elasticsearch queries, retrieval, ingestion, graph access, business logic, and streaming responses.

## Architecture Role

Frontend (Next.js) -> Backend (NestJS) -> FastAPI LLM Service -> Ollama

Data and cache dependencies:

- Elasticsearch: document/chunk indexing and retrieval
- Redis: short-lived caching for search/context
- Local graph persistence: graph data initialization and reads

## Main Responsibilities

- Validate incoming API requests
- Ingest files/text and index searchable chunks
- Retrieve relevant context from Elasticsearch
- Call LLM sidecar for answer generation/streaming
- Return source attribution to the frontend
- Apply global exception handling and rate limiting

## Tech Stack

- NestJS (Express platform), Throttling via @nestjs/throttler
- TypeScript
- Elasticsearch
- Redis (ioredis)
- Server-Sent Events (SSE) for streaming responses

## Backend Capabilities

- Build context from retrieved documents
- Return source attribution to the frontend
- Apply rate limiting (60 requests per minute per IP)

## API Endpoints.

Base URL: http://localhost:3001

1. POST /upload

- Accepts text/content and optional file upload
- Parses and split into chunk and writes into ingests documents Elasticsearch (searchable)

2. GET /search?q=...

- Returns search results for query text(Elasticsearch)

3. POST /ask

- Non-streaming answer generation
- Returns answer + sources

4. POST /ask/stream

- Streaming answer generation (SSE)
- Emits `data: {"type":"answer","content":"..."}` events, then `{"type":"sources","sources":[...]}`, then `data: [DONE]`
- On failure an event `{"type":"error","error":"..."}` is sent

5. GET /documents/:id

- Fetch document by id

6. POST /documents/:id/summary

- Non-streaming summary request doc from Elasticsearch then request LLM side for summary generation

7. GET /documents/:id/summary/stream

- Streaming summary (SSE)

8. GET /graph

- Returns graph nodes and edges

## Local Run

1. Install dependencies

npm install

2. Start backend in development

npm run dev

3. Build backend

npm run build

4. Run production build output

npm run start

5. Lint, type-check and test

npm run lint
npm run typecheck
npm test

## Required Environment

Common environment variables:

- PORT=3001
- ES_NODE=http://localhost:9200
- ES_INDEX=insightgraph
- LLM_SERVICE_URL=http://127.0.0.1:8000
- REDIS_URL=redis://localhost:6379 (optional; the backend runs without caching if Redis is unreachable)
- OPENAI_API_KEY (optional; enables OpenAI triplet extraction and summaries, otherwise a heuristic fallback is used)

The backend reads real environment variables and does not load `.env` files; export them or use your shell's env loader. See `.env.example`.

## Related Docs

- Root overview: ../README.md
- LLM sidecar: ../llm-service/README.md
