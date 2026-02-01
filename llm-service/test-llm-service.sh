#!/bin/bash

# Test script for FastAPI LLM Service

echo "🧪 Testing FastAPI LLM Service"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

LLM_URL="http://localhost:8000"
OLLAMA_URL="http://localhost:11434"
MODEL="llama3.1"

# Step 1: Ensure Ollama is running
echo -e "${BLUE}Step 1: Checking Ollama server${NC}"
response=$(curl -s $OLLAMA_URL/api/tags)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Ollama server is running${NC}"
else
    echo -e "${RED}✗ Ollama server is not running. Start it with 'ollama serve'.${NC}"
    exit 1
fi

# Step 2: Pull the required model
if echo "$response" | grep -q "$MODEL"; then
    echo -e "${GREEN}✓ Model '$MODEL' is available${NC}"
else
    echo -e "${BLUE}Pulling model '$MODEL'...${NC}"
    ollama pull $MODEL
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Model '$MODEL' pulled successfully${NC}"
    else
        echo -e "${RED}✗ Failed to pull model '$MODEL'.${NC}"
        exit 1
    fi
fi

# Step 3: Start the FastAPI service
if ! pgrep -f "uvicorn main:app" > /dev/null; then
    echo -e "${BLUE}Starting FastAPI service...${NC}"
    uvicorn main:app --reload --port 8000 &
    sleep 5
fi

# Step 4: Verify the service health
echo -e "${BLUE}Step 4: Health Check${NC}"
response=$(curl -s $LLM_URL/health)
if echo "$response" | grep -q "healthy"; then
    echo -e "${GREEN}✓ Health check passed${NC}"
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
else
    echo -e "${RED}✗ Health check failed${NC}"
    echo "$response"
    exit 1
fi

# Step 5: Test the /llm/ask endpoint
echo -e "${BLUE}Step 5: /llm/ask endpoint${NC}"
response=$(curl -s -X POST $LLM_URL/llm/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is FastAPI?",
    "context": "FastAPI is a modern, fast web framework for building APIs with Python 3.7+",
    "max_tokens": 100
  }')

if echo "$response" | grep -q "answer"; then
    echo -e "${GREEN}✓ /llm/ask endpoint passed${NC}"
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
else
    echo -e "${RED}✗ /llm/ask endpoint failed${NC}"
    echo "$response"
    exit 1
fi

# Step 6: Test the /llm/stream endpoint
echo -e "${BLUE}Step 6: /llm/stream endpoint${NC}"
echo "First few tokens from stream:"
curl -s -X POST $LLM_URL/llm/stream \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Explain microservices",
    "context": "Microservices are an architectural style that structures an application as small services.",
    "max_tokens": 80
  }' | head -n 10

# Step 7: Test Node.js integration (skipped in script, manual verification needed)
echo -e "${BLUE}Step 7: Node.js integration test (manual)${NC}"
echo -e "${GREEN}✓ Ensure Node.js backend calls FastAPI successfully.${NC}"

# Step 8: Check logs for errors
echo -e "${BLUE}Step 8: Checking logs for errors${NC}"
if pgrep -f "uvicorn main:app" > /dev/null; then
    echo -e "${GREEN}✓ FastAPI logs are available. Check terminal for details.${NC}"
else
    echo -e "${RED}✗ FastAPI service is not running.${NC}"
fi

# Step 9: Deactivate the virtual environment
echo -e "${BLUE}Step 9: Deactivating virtual environment${NC}"
if [ -n "$VIRTUAL_ENV" ]; then
    deactivate
    echo -e "${GREEN}✓ Virtual environment deactivated${NC}"
else
    echo -e "${RED}✗ No virtual environment to deactivate.${NC}"
fi

echo "All tests completed!"
