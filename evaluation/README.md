# Latency evaluation

This folder holds the test document, the questions and the raw results behind the latency numbers in the main README.

## Files

- `greenfield-handbook.md`: a fictional employee handbook (all names and numbers are invented). Upload it in the app; it is split into 4 chunks.
- `greenfield-questions.txt`: 13 questions with expected answers. Do not upload it; only ask the questions in the Ask page. Question 13 is a trick question: the answer is not in the document and the app should say it does not know.
- `result/run-score.csv` and `result/run-index.csv`: raw results, one row per question.

## What is compared

The backend retrieves the top 3 chunks and puts them in the prompt. `CONTEXT_ORDER` controls their order:

- `score` (default): ordered by Elasticsearch relevance score. The same 3 chunks can arrive in a different order, so the start of the prompt changes.
- `index`: ordered by position in the document, so the start of the prompt stays the same more often and Ollama can reuse its cached prompt prefix.

## How to reproduce

1. Start Elasticsearch (`docker compose up -d elasticsearch`) and run Ollama natively with the model set in `llm-service/.env` (`llama3.2:3b` in these runs). Verify both are really up; otherwise the app silently falls back and the numbers are meaningless. Do not start the `ollama` service from `docker-compose.yml`.
2. Start the app with the order to test: `CONTEXT_ORDER=score ./start.sh` or `CONTEXT_ORDER=index ./start.sh`.
3. Upload `greenfield-handbook.md` on the Upload page.
4. Ask the 13 questions on the Ask page, in the same order every time. Warm the model with one question first and do not count it.
5. Compare the runs.

## Metrics

- `ttft_ms`: time from sending the question to the first answer token, measured in the browser.
- `prompt_eval_ms` and `prompt_eval_count`: time and tokens Ollama spent reading the prompt. This is most of the wait.
- `retrieval_ms`: Elasticsearch search time.
- `context_hash` and `same_ctx_as_prev`: identify the context sent to the model. The same start of prompt means the cache can be reused.

## Results (one run per setting)

| | `score` order | `index` order |
| --- | --- | --- |
| Distinct contexts (of 13 questions) | 7 | 3 |
| Slow requests (prompt not cached) | 7 of 13 | 3 of 13 |
| Total prompt reading | 128 s | 57 s |
| Mean time to first token | 10.3 s | 4.6 s |

## Caveats

- One small document, 13 questions, one run per setting.
- One laptop (Intel i9, 16 GB, CPU only), `llama3.2:3b` through Ollama.
- Answer quality was not scored, only latency.
- This is a measurement, not a benchmark. A larger corpus or a different model can behave differently.
