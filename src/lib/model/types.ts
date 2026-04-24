export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

export interface ModelResult<T> {
  data: T;
  usage: ModelUsage;
  provider: string;
  model: string;
}

export interface LlmProvider {
  extractJson<T>(args: {
    system: string;
    prompt: string;
    schemaName: string;
  }): Promise<ModelResult<T>>;
}
