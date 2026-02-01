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
    title="InsightGraph LLM Service",
    description="FastAPI sidecar for LLM operations",
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
    tokens_used: Optional[int] = None

# System prompt for RAG
SYSTEM_PROMPT = """You are a helpful assistant that answers questions based on the provided context from documents.

Guidelines:
- Answer clearly and concisely based on the context
- If the context doesn't contain enough information, say so
- Reference specific information from the context when possible
- Keep your answer relevant and focused on the question
- Do not make up information outside the provided context"""

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
    """
    Standard endpoint - returns complete answer
    
    Node.js backend:
    1. Queries Elasticsearch
    2. Builds context from top documents
    3. Calls this endpoint
    4. Returns answer + sources to frontend
    """
    try:
        # Build a single prompt string for Ollama `/api/generate` API
        prompt = f"{SYSTEM_PROMPT}\n\nContext:\n{request.context}\n\nQuestion: {request.question}"

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

        # Ollama `/api/generate` returns `message.content` or `output` depending on version
        answer = (
            data.get("message", {}) .get("content")
            if isinstance(data.get("message"), dict)
            else None
        ) or data.get("output") or data.get("content") or ""
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
    """
    Streaming endpoint - returns answer tokens progressively
    
    Returns Server-Sent Events (SSE) compatible stream
    Compatible with existing Node.js SSE forwarding
    """
    async def generate_stream():
        try:
            prompt = f"{SYSTEM_PROMPT}\n\nContext:\n{request.context}\n\nQuestion: {request.question}"

            options = {"temperature": request.temperature}
            if request.max_tokens:
                options["num_predict"] = request.max_tokens

            payload = {
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": True,
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
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )
