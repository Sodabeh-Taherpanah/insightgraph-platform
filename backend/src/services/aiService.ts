import axios from 'axios';

export type Triplet = { subject: string; predicate: string; object: string };

/**
 * Attempts to use an LLM to extract triplets.
 * Fallback -> basic heuristic extraction if API key is not provided.
 */
export async function extractTripletsFromText(
  text: string,
): Promise<Triplet[]> {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  const MAX_TOKENS = 400;

  // If there's an API key, call OpenAI completions (example)
  if (OPENAI_KEY) {
    try {
      const prompt = `Extract subject-predicate-object triplets from the text. 
Return JSON array like [{"subject":"...","predicate":"...","object":"..."}, ...]. 
Text:
"""${text}"""`;

      const resp = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini', // replace with available model in your account
          messages: [{ role: 'user', content: prompt }],
          max_tokens: MAX_TOKENS,
          temperature: 0.0,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const content = resp.data?.choices?.[0]?.message?.content;
      if (!content) return [];

      // Try parse JSON from model output
      const jsonStart = content.indexOf('[');
      const jsonEnd = content.lastIndexOf(']') + 1;
      const jsonText =
        jsonStart >= 0 && jsonEnd > jsonStart
          ? content.slice(jsonStart, jsonEnd)
          : content;
      const triplets = JSON.parse(jsonText) as Triplet[];
      return Array.isArray(triplets) ? triplets : [];
    } catch (err) {
      console.warn('LLM extraction failed, falling back to heuristic', err);
      return heuristicExtract(text);
    }
  }

  // No API key -> heuristic extraction
  return heuristicExtract(text);
}

/**
 * Very simple fallback: split sentences and look for "X * Y" patterns.
 * This is naive but useful for demo & offline work.
 */
function heuristicExtract(text: string): Triplet[] {
  const sentences = text
    .split(/[.\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: Triplet[] = [];

  for (const s of sentences) {
    // match "X uses Y" or "X is a Y" or "X has Y"
    const re =
      /(.+?)\s+(uses|use|is a|is an|is|has|contains|provides|gives)\s+(.+)/i;
    const m = s.match(re);
    if (m) {
      const subject = m[1].trim().slice(0, 80);
      const predicate = m[2].trim().slice(0, 40);
      const object = m[3].trim().slice(0, 80);
      out.push({ subject, predicate, object });
    }
  }

  // fallback: if none found, create a doc-level relation
  if (out.length === 0 && sentences.length > 0) {
    out.push({
      subject: 'document',
      predicate: 'mentions',
      object: sentences[0].slice(0, 120),
    });
  }

  return out;
}

/**
 * Answers a question using provided context via LLM.
 * Fallback -> simple keyword matching if API key is not provided.
 */
export async function answerQuestionWithContext(
  context: string,
  question: string,
): Promise<string> {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  const MAX_TOKENS = 500;

  if (OPENAI_KEY) {
    try {
      const systemPrompt = `You are a helpful assistant that answers questions based on the provided context. If the context doesn't contain enough information to answer the question, say so clearly. Keep your answer concise and relevant.`;

      const userPrompt = `Context:\n${context}\n\nQuestion: ${question}`;

      const resp = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: MAX_TOKENS,
          temperature: 0.3,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const content = resp.data?.choices?.[0]?.message?.content;
      return content || 'I could not generate an answer.';
    } catch (err) {
      console.warn('LLM answer failed, falling back to keyword matching', err);
      return fallbackAnswer(context, question);
    }
  }

  // No API key -> fallback
  return fallbackAnswer(context, question);
}

/**
 * Simple fallback: look for sentences containing question keywords.
 */
function fallbackAnswer(context: string, question: string): string {
  const sentences = context
    .split(/[.\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const keywords = question
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const relevant = sentences.filter((s) =>
    keywords.some((k) => s.toLowerCase().includes(k)),
  );

  if (relevant.length > 0) {
    return relevant.slice(0, 3).join('. ') + '.';
  }

  return 'No relevant information found in the context.';
}

/**
 * Streams answer tokens one by one via callback.
 * Suitable for SSE or WebSocket streaming.
 * Fallback -> stream fallback answer slowly if API key is not provided.
 */
export async function answerQuestionStreaming(
  context: string,
  question: string,
  onToken: (token: string) => void,
): Promise<void> {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  const MAX_TOKENS = 500;

  if (OPENAI_KEY) {
    try {
      const systemPrompt = `You are a helpful assistant that answers questions based on the provided context. If the context doesn't contain enough information to answer the question, say so clearly. Keep your answer concise and relevant.`;

      const userPrompt = `Context:\n${context}\n\nQuestion: ${question}`;

      const resp = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: MAX_TOKENS,
          temperature: 0.3,
          stream: true,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_KEY}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
        },
      );

      // Process streaming response
      return new Promise((resolve, reject) => {
        resp.data.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                resolve();
                return;
              }
              try {
                const json = JSON.parse(data);
                const token = json.choices?.[0]?.delta?.content;
                if (token) {
                  onToken(token);
                }
              } catch (e) {
                // Ignore parse errors in stream
              }
            }
          }
        });

        resp.data.on('error', (err: Error) => {
          console.warn(
            'Streaming failed, falling back to keyword matching',
            err,
          );
          // Stream fallback answer with delay for visual effect
          const fallback = fallbackAnswer(context, question);
          const chars = fallback.split('');
          let index = 0;
          const interval = setInterval(() => {
            if (index < chars.length) {
              onToken(chars[index]);
              index++;
            } else {
              clearInterval(interval);
              resolve();
            }
          }, 20); // 20ms between tokens for smooth streaming
        });
      });
    } catch (err) {
      console.warn(
        'LLM streaming failed, falling back to keyword matching',
        err,
      );
      // Stream fallback answer with delay for visual effect
      return new Promise((resolve) => {
        const fallback = fallbackAnswer(context, question);
        const chars = fallback.split('');
        let index = 0;
        const interval = setInterval(() => {
          if (index < chars.length) {
            onToken(chars[index]);
            index++;
          } else {
            clearInterval(interval);
            resolve();
          }
        }, 20); // 20ms between tokens for smooth streaming
      });
    }
  }

  // No API key -> stream fallback answer slowly
  return new Promise((resolve) => {
    const fallback = fallbackAnswer(context, question);
    const chars = fallback.split('');
    let index = 0;
    const interval = setInterval(() => {
      if (index < chars.length) {
        onToken(chars[index]);
        index++;
      } else {
        clearInterval(interval);
        resolve();
      }
    }, 20); // 20ms between tokens for smooth streaming
  });
}

/**
 * Summarize a given text using the LLM (non-streaming).
 */
export async function summarizeText(text: string): Promise<string> {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  const MAX_TOKENS = 300;

  if (OPENAI_KEY) {
    try {
      const systemPrompt = `You are a helpful assistant that summarizes documents. Produce a concise summary in bullet points and a short one-paragraph overview. Be factual and avoid adding new information.`;

      const userPrompt = `Document:\n${text}\n\nProvide: (1) a one-paragraph summary, and (2) up to 6 concise bullet points highlighting the most important facts.`;

      const resp = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: MAX_TOKENS,
          temperature: 0.2,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const content = resp.data?.choices?.[0]?.message?.content;
      return content || 'Could not generate summary.';
    } catch (err) {
      console.warn('Summarization failed, falling back to heuristic', err);
      // fallback to simple extract below
    }
  }

  // Simple fallback summarizer: take first 3 sentences + first 6 lines as pseudo-bullets
  const sentences = text
    .replace(/\r/g, '')
    .split(/[.\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const para =
    sentences.slice(0, 3).join('. ') + (sentences.length > 0 ? '.' : '');
  const bullets = sentences.slice(0, 6).map((s) => `• ${s}`);
  return [para, '', ...bullets].join('\n');
}

/**
 * Streams a summary token-by-token via callback. Uses streaming API when available.
 */
export async function summarizeTextStreaming(
  text: string,
  onToken: (token: string) => void,
): Promise<void> {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  const MAX_TOKENS = 300;

  if (OPENAI_KEY) {
    try {
      const systemPrompt = `You are a helpful assistant that summarizes documents. Produce a concise summary in bullet points and a short one-paragraph overview.`;
      const userPrompt = `Document:\n${text}\n\nProvide a one-paragraph summary followed by bullet points.`;

      const resp = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: MAX_TOKENS,
          temperature: 0.2,
          stream: true,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_KEY}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
        },
      );

      return new Promise((resolve, reject) => {
        resp.data.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                resolve();
                return;
              }
              try {
                const json = JSON.parse(data);
                const token = json.choices?.[0]?.delta?.content;
                if (token) onToken(token);
              } catch (e) {
                // ignore parse errors
              }
            }
          }
        });

        resp.data.on('error', (err: Error) => {
          console.warn('Summarization stream failed, falling back', err);
          const fallbackPromise = summarizeText(text);
          fallbackPromise.then((s) => {
            const chars = s.split('');
            let idx = 0;
            const iv = setInterval(() => {
              if (idx < chars.length) {
                onToken(chars[idx]);
                idx++;
              } else {
                clearInterval(iv);
                resolve();
              }
            }, 20);
          });
        });
      });
    } catch (err) {
      console.warn('LLM streaming summarize failed, falling back', err);
    }
  }

  // No key: fallback streaming of simple summary
  return new Promise((resolve) => {
    summarizeText(text).then((summary) => {
      const chars = summary.split('');
      let idx = 0;
      const iv = setInterval(() => {
        if (idx < chars.length) {
          onToken(chars[idx]);
          idx++;
        } else {
          clearInterval(iv);
          resolve();
        }
      }, 20);
    });
  });
}
