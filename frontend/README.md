# Frontend (Next.js)

Next.js (App Router) UI for InsightGraph: upload documents, ask questions with streamed answers, search chunks and explore the knowledge graph.

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Landing page |
| `/upload` | Upload text or a file (`.txt`, `.md`, `.docx`, `.xlsx`, `.pdf`) |
| `/ask` | Ask a question; the answer is streamed over SSE from the backend, followed by its sources |
| `/search` | Full-text search over indexed chunks |
| `/graph` | Knowledge graph view (React Flow) |
| `/documents/[id]` | A single indexed chunk and its summary |

## Run locally

```bash
npm install
npm run dev     # http://localhost:3000
```

Other scripts: `npm run build`, `npm run start`, `npm run lint`.

## Configuration

The backend base URL comes from `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`), read in `lib/api.ts`. Copy `.env.example` to `.env.local` to change it. The variable is inlined at build time, so restart `npm run dev` (or rebuild) after changing it.

## Streaming

`/ask` calls `POST {API_BASE}/ask/stream` and parses Server-Sent Events: `{"type":"answer","content":"..."}` chunks, a `{"type":"sources",...}` event and `[DONE]`. Event types it does not know are ignored.

## Related docs

- Root overview: ../README.md
- Backend API: ../backend/README.md
- LLM sidecar: ../llm-service/README.md
