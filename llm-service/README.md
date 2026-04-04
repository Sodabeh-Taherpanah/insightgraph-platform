# LLM Service (FastAPI Sidecar)

FastAPI microservice handling all LLM operations for InsightGraph.
FastAPI handles:

- Ollama API calls
- Prompt engineering
- Token streaming
-

## Architecture

```
┌──────────────┐         ┌────────────┐
│    NestJS    │────────▶│  FastAPI   │
│   Backend    │         │  LLM Svc   │
└──────────────┘         └────────────┘
  │                         │
  ▼                         ▼
┌──────────────┐         ┌────────────┐
│Elasticsearch │         │  Ollama    │
└──────────────┘         └────────────┘
```

**Separation of Concerns:**

## Endpoints

### `POST /llm/ask`

Standard completion - returns full answer at once.

**Request:**

```json
{
  "question": "What is the onboarding process for engineers at Company X?",
  "context": "At Company X, engineering onboarding covers setting up your laptop, configuring development tools, getting access to internal repositories, completing security and compliance training, and meeting your onboarding mentor. All new engineers must finish these steps and submit their first pull request within two weeks.",
  "max_tokens": 300,
  "temperature": 0.2
}
```

**Response:**

```json
{
  "answer": "At Company X, engineering onboarding is completed over the first two weeks. A new engineer sets up their laptop and development tools, gets access to internal repositories, completes security and compliance training, works with an onboarding mentor, and is expected to submit a first pull request by the end of that period.",
  "model": "llama3.1",
  "tokens_used": 60
}
```

### `POST /llm/stream`

Same request body as `/llm/ask`, but returns the answer progressively as raw SSE token chunks.

**Request:** Same as `/llm/ask`

**Response:** Server-Sent Events stream

```
data: At Company X,
data:  engineering onboarding is completed over the first two weeks.
data:  A new engineer sets up their laptop and development tools,
data:  gets access to internal repositories,
data:  completes security and compliance training,
data:  works with an onboarding mentor,
data:  and is expected to submit a first pull request by the end of that period.
...
data: [DONE]
```

### `GET /health`

Health check.

```json
{
  "status": "healthy",
  "service": "llm-service",
  "ollama_url": "http://localhost:11434",
  "ollama_model": "llama3.1",
  "ollama_reachable": true
}
```

## Setup

### With Virtual Environment

```bash
cd llm-service

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On macOS/Linux
# OR
venv\Scripts\activate  # On Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Optionally edit OLLAMA_BASE_URL / OLLAMA_MODEL

# Start Ollama (run in a separate terminal)
```bash
ollama serve
```

# Check Ollama server
```bash
curl http://localhost:11434/api/tags
```

# If model not pulled yet:
```bash
ollama pull llama3.1
```

# Run locally
python3 main.py

# Or with uvicorn directly:
uvicorn main:app --reload --port 8000

# To deactivate when done
deactivate
```

### Testing & Verification

After completing the Setup steps and starting Ollama and the FastAPI service, run these verification checks. This section assumes you've already followed the Setup instructions (virtualenv, dependencies, and starting the service).

1. Verify Ollama is reachable:

```bash
curl http://localhost:11434/api/tags
```

2. If the model is missing, pull it:

```bash
ollama pull llama3.1
```

3. Check FastAPI health:

```bash
curl http://localhost:8000/health
```

4. Functional API checks (use these against a running FastAPI instance):

- Non-streaming `/llm/ask`:

```bash
curl -X POST http://localhost:8000/llm/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"What is FastAPI?","context":"FastAPI is a modern web framework","max_tokens":100}'
```

- Streaming `/llm/stream` (SSE):

```bash
curl -N -X POST http://localhost:8000/llm/stream \
  -H "Content-Type: application/json" \
  -d '{"question":"Explain microservices","context":"Microservices are an architectural style","max_tokens":80}'
```

5. Integration: run the NestJS backend and exercise `/ask` through the backend API to confirm end-to-end behavior.

6. Check logs for errors if any tests fail.

## Integration with NestJS

The NestJS backend calls this service:

```typescript
// In backend aiService.ts
const response = await axios.post('http://localhost:8000/llm/ask', {
  question: question,
  context: context,
  max_tokens: 500,
  temperature: 0.3,
});

const answer = response.data.answer;
```

## Next Steps (Optional)

- Add embeddings endpoint for semantic search
- Support multiple LLM providers (Anthropic, Cohere)
- Add prompt template management
- Implement caching layer
- Add request logging and monitoring
