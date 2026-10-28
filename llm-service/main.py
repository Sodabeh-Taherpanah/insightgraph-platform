"""
FastAPI LLM Service
Handles all LLM operations for InsightGraph
"""
import json
import os
from typing import Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

# Load environment variables
load_dotenv()

app = FastAPI(
    title="LLM Service",
    description="FastAPI for LLM operations",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Ollama
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1")

# Models
class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)
    context: str = Field(..., description="Context from Elasticsearch documents")
    max_tokens: Optional[int] = Field(500, ge=50, le=2000)
    temperature: Optional[float] = Field(0.3, ge=0.0, le=2.0)

class AskResponse(BaseModel):
    answer: str
    model: str
    tokens_used: Optional[int] = None  # total model tokens ( a unit of text that model processes) consumed

# System prompt for RAG
SYSTEM_PROMPT = """You are a helpful assistant that answers questions based on the provided context from documents.

Guidelines:
- Read the provided context and synthesize a concise, useful answer for a human reader.
- Paraphrase and summarize; do not repeat the context verbatim or copy long sentences.
- If the context lacks sufficient detail, say so and note what is missing.
- Prefer short, explanatory sentences and include one or two practical next steps or clarifying points when helpful.
- Reference specific facts from the context when relevant, but avoid long verbatim quotes.
- Do not invent facts outside the provided context."""

# TEMP: latency measurement
def _stats_event(d: dict) -> str:
    """Build one SSE event with Ollama's final-chunk stats (durations: ns -> ms)."""
    ms = lambda k: round((d.get(k) or 0) / 1e6)
    return "data: " + json.dumps({
        "type": "stats",
        "prompt_eval_count": d.get("prompt_eval_count"),
        "prompt_eval_duration_ms": ms("prompt_eval_duration"),
        "eval_count": d.get("eval_count"),
        "eval_duration_ms": ms("eval_duration"),
        "load_duration_ms": ms("load_duration"),
    }) + "\n\n"

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    reachable = False
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            reachable = resp.status_code == 200
    except Exception:
        reachable = False

    return {
        "status": "healthy",
        "service": "llm-service",
        "ollama_url": OLLAMA_BASE_URL,
        "ollama_model": OLLAMA_MODEL,
        "ollama_reachable": reachable,
    }

@app.post("/llm/ask", response_model=AskResponse)
async def ask_question(request: AskRequest):
    """Send question + context to Ollama and return the full answer."""
    try:
        # Build a single prompt string for Ollama `/api/generate` API
        prompt = f"{SYSTEM_PROMPT}\n\nContext:\n{request.context}\n\nQuestion: {request.question}"
        # send this generation randomness setting to the model
        options = {"temperature": request.temperature}
        if request.max_tokens:
            options["num_predict"] = request.max_tokens

        payload = {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": options,
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            # Prefer /api/generate; fall back to /api/chat if needed
            try:
                resp = await client.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload)
                resp.raise_for_status()
                data = resp.json()
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 404:
                    # Try legacy /api/chat shape (if Ollama provides it)
                    resp = await client.post(f"{OLLAMA_BASE_URL}/api/chat", json=payload)
                    resp.raise_for_status()
                    data = resp.json()
                else:
                    raise

        # Ollama `/api/generate` may return the generated text under different keys , there are two endpoints,but different Ollama versions / adapters / streaming vs non‑streaming modes.
        # so they return the generated text in different JSON keys . d.get(...)
        def _extract_answer(d: dict) -> str:
            if not d:
                return ""
            # common Ollama field.  by api/generate
            if isinstance(d.get("response"), str):
                return d.get("response")
            # message object with content by api/chat
            msg = d.get("message")
            if isinstance(msg, dict):
                for k in ("content", "response", "text"):
                    if isinstance(msg.get(k), str) and msg.get(k):
                        return msg.get(k)
            # direct output field (string or list)
            out = d.get("output") or d.get("content")
            if isinstance(out, str) and out:
                return out
            if isinstance(out, list) and out:
                first = out[0]
                if isinstance(first, str) and first:
                    return first
                if isinstance(first, dict):
                    for k in ("content", "text", "response"):
                        if isinstance(first.get(k), str) and first.get(k):
                            return first.get(k)
            # OpenAI-like choices
            choices = d.get("choices")
            if isinstance(choices, list) and choices:
                c0 = choices[0]
                if isinstance(c0, dict):
                    if isinstance(c0.get("message"), dict):
                        return c0.get("message", {}).get("content", "") or c0.get("text", "")
                    return c0.get("text", "") or c0.get("message", "")
            # fallback: return first non-empty string field (excluding meta)
            for k, v in d.items():
                if k in ("model", "id"):
                    continue
                if isinstance(v, str) and v:
                    return v
            return ""

        answer = _extract_answer(data) or ""
        tokens_used = None
        if "prompt_eval_count" in data or "eval_count" in data:
            tokens_used = (data.get("prompt_eval_count", 0) or 0) + (
                data.get("eval_count", 0) or 0
            )

        return AskResponse(
            answer=answer or "I could not generate an answer.",
            model=data.get("model", OLLAMA_MODEL),
            tokens_used=tokens_used,
        )
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Ollama error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

@app.post("/llm/stream")
async def stream_question(request: AskRequest):
    """Stream Ollama response token-by-token as Server-Sent Events."""
    async def generate_stream():
        """Async generator that yields SSE-formatted tokens from Ollama."""
        try:
            prompt = f"{SYSTEM_PROMPT}\n\nContext:\n{request.context}\n\nQuestion: {request.question}"

            options = {"temperature": request.temperature}
            if request.max_tokens:
                options["num_predict"] = request.max_tokens

            payload = {
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": True,
                "keep_alive": "30m",
                "options": options,
            }

            async with httpx.AsyncClient(timeout=None) as client:
                # Prefer /api/generate streaming; fall back to /api/chat
                try:
                    async with client.stream("POST", f"{OLLAMA_BASE_URL}/api/generate", json=payload) as resp:
                        resp.raise_for_status()
                        async for line in resp.aiter_lines():
                            if not line:
                                continue
                            data = json.loads(line)
                            # Ollama /api/generate uses "response" field, not "message"
                            token = data.get("response")
                            if token:
                                yield f"data: {token}\n\n"
                            if data.get("done"):
                                yield _stats_event(data)  # TEMP: latency measurement
                                yield "data: [DONE]\n\n"
                                return
                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 404:
                        async with client.stream("POST", f"{OLLAMA_BASE_URL}/api/chat", json=payload) as resp:
                            resp.raise_for_status()
                            async for line in resp.aiter_lines():
                                if not line:
                                    continue
                                data = json.loads(line)
                                token = data.get("message", {}).get("content")
                                if token:
                                    yield f"data: {token}\n\n"
                                if data.get("done"):
                                    yield _stats_event(data)  # TEMP: latency measurement
                                    yield "data: [DONE]\n\n"
                                    return
                    else:
                        raise
        except httpx.HTTPError as e:
            yield f"data: {{\"error\": \"Ollama error: {str(e)}\"}}\n\n"
        except Exception as e:
            yield f"data: {{\"error\": \"Internal error: {str(e)}\"}}\n\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        }
    )

if __name__ == "__main__":
    # Start uvicorn directly when running file,  the ASGI web server used to run the FastAPI app on  port 8000`
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )
