import axios from 'axios';

export type Triplet = { subject: string; predicate: string; object: string };

/**
 * Attempts to use an LLM to extract triplets.
 * Fallback -> basic heuristic extraction if API key is not provided.
 */
export async function extractTripletsFromText(
  text: string
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
        }
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
  question: string
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
        }
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
    keywords.some((k) => s.toLowerCase().includes(k))
  );

  if (relevant.length > 0) {
    return relevant.slice(0, 3).join('. ') + '.';
  }

  return 'No relevant information found in the context.';
}
