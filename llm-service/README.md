# llm-service (FastAPI)

A small FastAPI service that sends a question and its context to Ollama and returns the answer, either at once or as a stream. The backend is its only client.

```
Backend -> llm-service :8000 -> Ollama :11434
```

## Endpoints

### `GET /health`

```json
{
  "status": "healthy",
  "service": "llm-service",
  "ollama_url": "http://localhost:11434",
  "ollama_model": "llama3.1",
  "ollama_reachable": true
}
```

### `POST /llm/ask`

Returns the full answer at once.

Request body:

| Field | Type | Notes |
| --- | --- | --- |
| `question` | string | Required, 1 to 500 characters |
| `context` | string | Required. Text the answer must be based on. |
| `max_tokens` | integer | Optional, 50 to 2000, default 500 |
| `temperature` | number | Optional, 0 to 2, default 0.3 |

Response:

```json
{ "answer": "...", "model": "llama3.1", "tokens_used": 60 }
```

### `POST /llm/stream`

Same request body. The answer is returned as Server-Sent Events, one event per token, then a `stats` event, then `[DONE]`:

```
data: At Company X,

data:  engineering onboarding is completed over the first two weeks.

data: {"type":"stats","prompt_eval_count":...,"prompt_eval_duration_ms":...,"eval_count":...,"eval_duration_ms":...,"load_duration_ms":...}

data: [DONE]
```

Notes for clients:

- Tokens keep their own whitespace. A token can be a single space, and most tokens start with a space. Do not trim tokens, or words will run together. Only strip the newlines that separate events.
- The `stats` event carries Ollama's timing for the request. It is used for latency measurement and is marked `// TEMP: latency measurement` in the code.
- On failure the stream sends one event of the form `data: {"error": "..."}`.
- The model is kept loaded in Ollama for 30 minutes (`keep_alive`).

The system prompt tells the model to answer only from the context and to say when the context is not enough.

## Configuration

The service reads environment variables, or `llm-service/.env` (see `.env.example`).

| Variable | Default | Purpose |
| --- | --- | --- |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server |
| `OLLAMA_MODEL` | `llama3.1` | Model used for both endpoints |
| `PORT` | `8000` | Port when started with `python3 main.py` |

The project was tested with `llama3.2:3b`. Set `OLLAMA_MODEL=llama3.2:3b` in `.env` to use it.

## Run

Ollama must be running with the model pulled (`ollama pull llama3.2:3b`).

```bash
cd llm-service
python3 -m venv venv
venv/bin/pip install -r requirements.txt
cp .env.example .env     # then edit OLLAMA_MODEL
venv/bin/python main.py  # http://localhost:8000
```

From the repository root, `./start.sh` starts this service together with the backend and frontend.

## Check it

```bash
curl http://localhost:11434/api/tags      # Ollama is up and lists the model
curl http://localhost:8000/health

curl -X POST http://localhost:8000/llm/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"What is FastAPI?","context":"FastAPI is a web framework for building APIs with Python.","max_tokens":100}'

curl -N -X POST http://localhost:8000/llm/stream \
  -H "Content-Type: application/json" \
  -d '{"question":"What is a microservice?","context":"Microservices are an architectural style.","max_tokens":80}'
```

`test-llm-service.sh` runs a scripted version of these checks.

## Related docs

- [Root README](../README.md)
- [Backend](../backend/README.md)
