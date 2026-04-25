import type { LlmProvider, ModelResult } from "./types";

class NoopProvider implements LlmProvider {
  async extractJson<T>(): Promise<ModelResult<T>> {
    return {
      data: {} as T,
      usage: { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 },
      provider: "none",
      model: "none",
    };
  }
}

class GeminiProvider implements LlmProvider {
  private model: string;
  private apiKey: string;

  constructor() {
    this.model = process.env.LLM_MODEL || "";
    this.apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";

    if (!this.model) {
      throw new Error("LLM_MODEL is required when LLM_PROVIDER=gemini.");
    }

    if (!this.apiKey) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required when LLM_PROVIDER=gemini.");
    }
  }

  async extractJson<T>({
    system,
    prompt,
    schemaName,
  }: {
    system: string;
    prompt: string;
    schemaName: string;
  }): Promise<ModelResult<T>> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        this.model,
      )}:generateContent?key=${encodeURIComponent(this.apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini request failed with ${response.status}.`);
    }

    const payload = (await response.json()) as GeminiResponse;
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error(`Gemini response did not include ${schemaName} JSON text.`);
    }

    return {
      data: JSON.parse(text) as T,
      usage: {
        inputTokens: payload.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: payload.usageMetadata?.candidatesTokenCount ?? 0,
        estimatedCostUsd: 0,
      },
      provider: "gemini",
      model: this.model,
    };
  }
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}

export function getLlmProvider(): LlmProvider {
  const provider = (process.env.LLM_PROVIDER ?? "none").toLowerCase();

  if (provider === "none") {
    return new NoopProvider();
  }

  if (provider === "gemini") {
    return new GeminiProvider();
  }

  throw new Error(
    `Unsupported LLM_PROVIDER "${provider}". Supported values are "none" and "gemini".`,
  );
}

export function isLlmResearchEnabled() {
  return (process.env.LLM_PROVIDER ?? "none").toLowerCase() !== "none";
}
