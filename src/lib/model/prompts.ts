const MAX_RESEARCH_PROMPT_SOURCE_LENGTH = 12_000;

export const researchExtractionSystemPrompt =
  "Extract only public factual signals and clearly separate public facts from inference. Never invent private customer, revenue, order, salesperson, quota, return, churn, or other internal operating data.";

export function buildResearchExtractionPrompt(sourceText: string) {
  const boundedSourceText = sourceText.slice(0, MAX_RESEARCH_PROMPT_SOURCE_LENGTH);

  return [
    "Extract product families, markets, channels, geographies, launches, buyer segments, and industry language from this public source text.",
    "Return concise structured JSON. Do not infer or invent private sales, customer, order, quota, return, rejection, churn, or revenue data.",
    "",
    "SOURCE:",
    boundedSourceText,
  ].join("\n");
}
