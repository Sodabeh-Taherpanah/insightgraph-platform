# Backend (NestJS)

The API behind InsightGraph. It validates requests, ingests documents, retrieves context from Elasticsearch, calls the llm-service and streams answers to the frontend.

```
Frontend -> Backend -> llm-service -> Ollama
               |
               +-> Elasticsearch (chunks, BM25 search)
               +-> Redis (optional cache)
               +-> backend/data/documents.json (fallback when Elasticsearch is down)
```

## What it does

- Parses `.txt`, `.md`, `.docx`, `.xlsx` and `.pdf` files, or takes plain text.
- Splits text into chunks of about 512 tokens with overlap (`src/utils/chunking.ts`) and indexes each chunk in Elasticsearch.
- Answers questions: BM25 search, then the llm-service, then sources.
- Limits requests to 60 per minute per IP.

## Endpoints

Base URL: `http://localhost:3001`

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/upload` | Ingest JSON text (`title`, `text` or `content`, up to 10,000 characters) or a multipart `file` |
| GET | `/search?q=` | Keyword search. Returns id, score, source and highlights per chunk. |
| POST | `/ask` | Answer a question. Returns `{ answer, sources }`. |
| POST | `/ask/stream` | Same answer as Server-Sent Events |
| GET | `/documents/:id` | One indexed chunk |
| POST | `/documents/:id/summary` | Summary of one chunk |
| GET | `/documents/:id/summary/stream` | Streamed summary |

`/ask/stream` sends `data: {"type":"answer","content":"..."}` events, then `{"type":"sources","sources":[...]}`, then `data: [DONE]`. On failure it sends `{"type":"error","error":"..."}`. It also sends `meta` and `stats` events for latency measurement, which clients can ignore.

## Fallbacks

- Redis unreachable: no caching.
- Elasticsearch unreachable: chunks are stored in and searched from `data/documents.json` by keyword counting. Elasticsearch is tried again after 30 seconds.
- llm-service or Ollama unreachable: the answer is built from sentences in the context that match the question.

## Run

```bash
npm install
npm run dev        # http://localhost:3001
npm run build
npm run start      # runs dist/main.js
npm run lint
npm run typecheck
npm test
```

From the repository root, `./start.sh` starts the backend together with the other services.

## Environment

The backend reads real environment variables and does not load `.env` files. Export them or set them on the command line. See `.env.example`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | Port |
| `ES_NODE` | `http://localhost:9200` | Elasticsearch URL |
| `ES_INDEX` | `insightgraph` | Index name |
| `LLM_SERVICE_URL` | `http://127.0.0.1:8000` | llm-service URL |
| `REDIS_URL` | `redis://localhost:6379` | Optional cache |
| `OPENAI_API_KEY` | empty | Optional. Chunk summaries. |
| `CONTEXT_CHUNKS` | `3` | Chunks sent to the model. Experiment switch. |
| `CONTEXT_ORDER` | `score` | `index` orders the context chunks by position in the document. Experiment switch. |

## Related docs

- [Root README](../README.md)
- [llm-service](../llm-service/README.md)
