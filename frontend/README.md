# Frontend (Next.js)

Next.js (App Router) UI for InsightGraph: upload documents, ask questions with streamed answers, search chunks and explore the knowledge graph.

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Home: what the app does and links to Upload, Ask and Search |
| `/upload` | Upload text or a file (`.txt`, `.md`, `.docx`, `.xlsx`, `.pdf`) |
| `/ask` | Ask a question; the answer is streamed over SSE from the backend, followed by its sources |
| `/search` | Full-text search; each hit is a card with the chunk text, Elasticsearch score and document title / chunk index, with "no results" and "backend unavailable" states |
| `/graph` | Knowledge graph view (React Flow). The page still exists but is not linked from the navigation |
| `/documents/[id]` | A single indexed chunk and its summary |

The navigation is a single top bar (Upload, Ask, Search) that collapses into a hamburger menu below the `md` breakpoint (768 px).

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
