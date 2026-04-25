const MAX_RESEARCH_PROMPT_SOURCE_LENGTH = 12_000;

export const researchExtractionSystemPrompt =
  "Extract public commercial signals for a synthetic B2B sales dataset. Use only the provided public source text for company-facing facts. Never invent private customer, revenue, order, salesperson, quota, return, churn, or other internal operating data.";

export function buildResearchExtractionPrompt(sourceText: string) {
  const boundedSourceText = sourceText.slice(0, MAX_RESEARCH_PROMPT_SOURCE_LENGTH);

  return [
    "Extract concise public signals from this source text for a realistic CRM/BI/ERP demo dataset.",
    "Prefer concrete nouns and phrases useful for sales simulation.",
    "For productFamilies, include catalog-like offerings, product categories, services sold as products, engineered systems, components, and custom manufacturing capabilities.",
    "For markets, include industries, applications, verticals, and end markets.",
    "For buyerSegments, include likely business buyer groups named or strongly implied by the public text, such as OEMs, distributors, maintenance teams, plant operations, engineering, procurement, or industrial customers.",
    "For industryLanguage, include domain phrases that would appear in opportunities, orders, returns, quality issues, and product descriptions.",
    'Return concise structured JSON with this exact shape: {"productFamilies":[],"markets":[],"channels":[],"geographies":[],"launches":[],"buyerSegments":[],"industryLanguage":[]}.',
    "Empty arrays are allowed only when the source text truly provides no relevant public signal for that field.",
    "Do not infer or invent private sales, customer, order, quota, return, rejection, churn, or revenue data.",
    "",
    "SOURCE:",
    boundedSourceText,
  ].join("\n");
}
