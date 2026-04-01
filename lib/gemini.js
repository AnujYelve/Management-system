/**
 * Gemini AI client — @google/generative-ai SDK (free tier)
 * Set GEMINI_API_KEY in .env.local
 *
 * Model fallback order (all free tier):
 *   1. gemini-2.0-flash-lite  (primary — highest RPM)
 *   2. gemini-2.0-flash       (secondary)
 *   3. gemini-1.5-flash-8b    (tertiary — separate quota bucket)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn('[Gemini] GEMINI_API_KEY not set — AI features disabled.');
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Models tried in order when quota is exceeded on one
const CHAT_MODELS = [
  "gemini-2.5-flash"
];

/**
 * Generate a chat response — tries each model in CHAT_MODELS order.
 * Throws the last error if all models are exhausted.
 */
export async function generateChatResponse(systemPrompt, userMessage, history = []) {
  if (!genAI) return 'AI features are currently unavailable. Please set GEMINI_API_KEY.';

  const formattedHistory = history.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.parts }],
  }));

  let lastError;
  for (const modelName of CHAT_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
      });
      const chat = model.startChat({ history: formattedHistory });
      const result = await chat.sendMessage(userMessage);
      console.log(`[Gemini] Used model: ${modelName}`);
      return result.response.text();
    } catch (err) {
      // 429 = quota exceeded, 404 = model not found → try next model
      if (err?.status === 429 || err?.status === 404) {
        console.warn(`[Gemini] ${modelName} failed (${err.status}) — trying next model`);
        lastError = err;
        continue;
      }
      // Any other error (auth, network) → throw immediately
      throw err;
    }
  }

  // All models exhausted
  throw lastError;
}

/**
 * Generate text embedding (768 dimensions) via text-embedding-004.
 */
export async function generateEmbedding(text) {
  if (!genAI) throw new Error('GEMINI_API_KEY is not configured');

  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * Cosine similarity between two equal-length vectors. Returns [-1, 1].
 */
export function cosineSimilarity(a, b) {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
