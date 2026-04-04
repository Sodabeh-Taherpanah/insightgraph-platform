# Backend Service (NestJS)

This service handles API orchestration, validation, retrieval, ingestion, graph access, and streaming responses.

For LLM-side details, see ../llm-service/README.md.

## Architecture Role

Flow:

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
- Apply API auth and rate limiting

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
- Emits tokens and final sources payload

5. GET /documents/:id

- Fetch document by id

6. POST /documents/:id/summary

- Non-streaming summary request doc from Elasticsearch then request LLM side for summary generation

1. GET /documents/:id/summary/stream

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

## Required Environment

Common environment variables:

- PORT=3001
- ES_NODE=http://localhost:9200
- ES_INDEX=insightgraph
- LLM_SERVICE_URL=http://localhost:8000
- REDIS_URL=redis://localhost:6379

## Related Docs

- Root overview: ../README.md
- LLM sidecar: ../llm-service/README.md
