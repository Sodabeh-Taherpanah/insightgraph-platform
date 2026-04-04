# LLM Service (FastAPI Sidecar)

FastAPI microservice handling all LLM operations for InsightGraph.

For full NestJS backend architecture and route details, see ../backend/README.md.

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

- **NestJS**: Orchestration, auth, ES queries, business logic
- **FastAPI**: Pure LLM operations (prompt handling, Ollama calls, streaming)

## Endpoints

### `POST /llm/ask`

Standard completion - returns full answer at once.

**Request:**

```json
{
  "question": "What is React?",
  "context": "React is a JavaScript library...", //after search Elasticsearch by nestjs and collect relevant text
  "max_tokens": 500,
  "temperature": 0.3
}
```

**Response:**

```json
{
  "answer": "React is a JavaScript library for building user interfaces...",
  "model": "llama3.1",
  "tokens_used": 245
}
```

### `POST /llm/stream`

like llm/ask but Streaming completion - returns tokens progressively via SSE.

**Request:** Same as `/llm/ask`

**Response:** Server-Sent Events stream

```
data: React
data:  is
data:  a
data:  JavaScript
data:  library
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

### Quick Run (Exact Commands)

```bash
cd /Users/sudabework/my_real_project/fullstack_insightgraph_AI/llm-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 main.py
```

### Option 1: With Virtual Environment (Recommended)

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

# Check Ollama server
curl http://localhost:11434/api/tags

# If model not pulled yet:
ollama pull llama3.1

# Run locally
python3 main.py
# Or with uvicorn directly:
uvicorn main:app --reload --port 8000

# To deactivate when done
deactivate
```

### Testing the LLM Service

Follow these steps to test the LLM service:

1. **Ensure Ollama is running locally:**
   - Start the Ollama server by running:
     ```bash
     ollama serve
     ```
   - Verify the server is running by checking available models:
     ```bash
     curl http://localhost:11434/api/tags
     ```

2. **Pull the required model:**
   - If the model is not already pulled, run:
     ```bash
     ollama pull llama3.1
     ```

3. **Start the FastAPI service:**
   - Navigate to the `llm-service` directory:
     ```bash
     cd llm-service
     ```
   - Activate the virtual environment:
     ```bash
     source venv/bin/activate
     ```
   - Start the service:
     ```bash
     uvicorn main:app --reload --port 8000
     ```

4. **Verify the service health:**
   - Check the `/health` endpoint:
     ```bash
     curl http://localhost:8000/health
     ```
   - Ensure the response indicates the service is healthy.

5. **Test the `/llm/ask` endpoint:**
   - Send a test request:
     ```bash
     curl -X POST http://localhost:8000/llm/ask \
       -H "Content-Type: application/json" \
       -d '{
         "question": "What is FastAPI?",
         "context": "FastAPI is a modern, fast web framework for building APIs with Python 3.7+",
         "max_tokens": 100
       }'
     ```
   - Verify the response contains the expected answer.

6. **Test the `/llm/stream` endpoint:**
   - Send a streaming request:
     ```bash
     curl -N -X POST http://localhost:8000/llm/stream \
       -H "Content-Type: application/json" \
       -d '{
         "question": "Explain microservices",
         "context": "Microservices are an architectural style that structures an application as small services.",
         "max_tokens": 80
       }'
     ```
   - Verify the response streams tokens progressively.

7. **Test integration with NestJS backend:**

- Ensure the NestJS backend is running.
- Verify it can successfully call the FastAPI service and return results to the frontend.

8. **Check logs for errors:**
   - Review the FastAPI logs for any errors or warnings during testing.

9. **Deactivate the virtual environment:**
   - When testing is complete, deactivate the virtual environment:
     ```bash
     deactivate
     ```

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

FastAPI only handles:

- Ollama API calls
- Prompt engineering
- Token streaming

## Next Steps (Optional)

- Add embeddings endpoint for semantic search
- Support multiple LLM providers (Anthropic, Cohere)
- Add prompt template management
- Implement caching layer
- Add request logging and monitoring
