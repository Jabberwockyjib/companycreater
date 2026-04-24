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
  const provider = (process.env.LLM_PROVIDER ?? "none").toLowerCase();

  if (provider === "none") {
    return new NoopProvider();
  }

  throw new Error(
    `Unsupported LLM_PROVIDER "${provider}". Set LLM_PROVIDER to "none" or leave it unset for the MVP fallback provider.`,
  );
}
