# InsightGraph Platform

InsightGraph is a **full-stack project** built to show how a real-world AI-backed search system can be designed step by step, with a strong focus on **clean backend architecture** and a **simple, usable frontend**.

The main goal of this project is to demonstrate how I approach system design as a **senior full-stack engineer**: starting with solid fundamentals, then carefully layering in intelligence without unnecessary complexity.

---

## Project Goal

The goal of InsightGraph is to allow users to ask questions about a set of documents and receive clear, relevant answers that are grounded in actual source data.

At this stage ( 1 to 3),the focus is on building the core needed to accomplish this goal.

- Building a reliable backend foundation
- Implementing search correctly before adding AI
- Keeping the system understandable, testable, and extensible

---

## High-Level Flow

1. A user submits a question
2. The backend searches Elasticsearch for relevant documents
3. The most relevant documents are selected and combined as context
4. The system prepares a clean prompt using the context and the question
5. An LLM generates an answer
6. The response includes both the answer and its sources

This flow is intentionally simple and easy to reason about.

---

## Roadmap (Current Scope)

### 1 — Foundation

**Goal:** Establish a stable backend base

What was built:

- Node.js + TypeScript setup
- Elasticsearch connection
- Document upload pipeline
- Basic search functionality

This layer acts as the backbone of the system and is intentionally kept stable.

---

### 2 — Backend Hardening

**Goal:** Make the backend feel production-ready

Focus areas:

- Request validation
- Clear separation of responsibilities in the codebase
- Basic structured logging
- Consistent error handling

Additional endpoint:

```http
GET /documents/:id
```

The goal of this phase is reliability and clarity, not adding new features.

---

### 3 — LLM Integration

**Goal:** Add intelligence in a controlled way

What is introduced:

- A simple LLM integration
- Explicit prompt structure:

  - System instruction
  - Retrieved document content
  - User question

New endpoint:

```http
POST /ask
```

Flow:

```
Question → Search → Prompt → LLM → Answer
```

There are no complex frameworks involved. The emphasis is on understanding exactly what the system is doing at every step.

---

## Tech Stack

- **Frontend:** Next.js
- **Backend:** Node.js with TypeScript
- **Search:** Elasticsearch
- **AI:** LLM API (OpenAI or Gemini)

---

## Current Status

The project is actively developed and currently focused on building a strong, understandable core before moving on to more advanced features.

---

## License

MIT
