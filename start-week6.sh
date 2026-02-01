#!/bin/bash

# Week 6 - Full Stack Startup Script
# Starts Node.js backend + FastAPI LLM service

set -e

echo "🚀 Starting InsightGraph Week 6 - Full Stack with FastAPI Sidecar"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env files exist
if [ ! -f "llm-service/.env" ]; then
    echo -e "${YELLOW}⚠️  Warning: llm-service/.env not found${NC}"
    echo "Creating from .env.example..."
    cp llm-service/.env.example llm-service/.env
    echo -e "${YELLOW}Please edit llm-service/.env if you want to change OLLAMA_BASE_URL or OLLAMA_MODEL${NC}"
    echo ""
fi

# Check for Ollama
if ! command -v ollama >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Ollama not found. Install it from https://ollama.com and run 'ollama pull llama3.1'${NC}"
    echo ""
fi

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $LLM_PID 2>/dev/null || true
    kill $BACKEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start FastAPI LLM Service
echo -e "${BLUE}Starting FastAPI LLM Service (port 8000)...${NC}"
cd llm-service
python3 main.py &
LLM_PID=$!
cd ..

# Wait for LLM service to be ready
echo "Waiting for LLM service to start..."
sleep 3

# Health check for LLM service
if curl -s http://localhost:8000/health > /dev/null; then
    echo -e "${GREEN}✓ FastAPI LLM Service ready${NC}"
else
    echo -e "${YELLOW}⚠️  LLM Service health check failed, but continuing...${NC}"
fi

echo ""

# Start Node.js Backend
echo -e "${BLUE}Starting Node.js Backend (port 3001)...${NC}"
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

echo ""
echo -e "${GREEN}✓ All services started!${NC}"
echo ""
echo "📊 Service URLs:"
echo "   - Node.js Backend:  http://localhost:3001"
echo "   - FastAPI LLM:      http://localhost:8000"
echo "   - Health Check:     http://localhost:8000/health"
echo ""
echo "📝 Architecture:"
echo "   Frontend (3000) → Node.js (3001) → FastAPI (8000) → Ollama (11434)"
echo "                          ↓"
echo "                   Elasticsearch"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for processes
wait
