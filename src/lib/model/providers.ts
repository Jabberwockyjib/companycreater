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

export function getLlmProvider(): LlmProvider {
  const provider = process.env.LLM_PROVIDER ?? "none";

  if (provider === "none") {
    return new NoopProvider();
  }

  return new NoopProvider();
}
