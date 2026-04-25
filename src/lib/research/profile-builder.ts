import type { CompanyProfile, ProfileClaim, ScenarioInput } from "@/lib/domain/types";
import type { ResearchExtraction } from "@/lib/model/types";
import type { ResearchSource } from "./sources";

export function buildProfileFromSources(
  input: ScenarioInput,
  sources: ResearchSource[],
  extraction?: ResearchExtraction,
): CompanyProfile {
  const sourceClaims: ProfileClaim[] = sources.map((source, index) => {
    if (source.sourceType === "fallback") {
      return {
        id: `source_claim_${index + 1}`,
        field: "source",
        value: `Public research unavailable: ${source.text}`,
        sourceType: "inferred",
        confidence: 0.2,
      };
    }

    return {
      id: `source_claim_${index + 1}`,
      field: "source",
      value: `Public source reviewed: ${source.title}`,
      sourceType: "public_fact",
      confidence: 0.7,
      ...(source.url ? { sourceUrl: source.url } : {}),
    };
  });

  return {
    companyName: input.companyName,
    industry: input.industry,
    revenueTarget: input.revenueTarget,
    regions: input.regions,
    channels: input.channels,
    claims: [
      ...sourceClaims,
      ...extractionToClaims(extraction),
      {
        id: "inferred_profile_scope",
        field: "profileScope",
        value:
          "Operating profile is inferred from public signals and user assumptions. Private sales, customer, order, quota, return, rejection, churn, and revenue records are not known.",
        sourceType: "inferred",
        confidence: 0.6,
      },
    ],
  };
}

function extractionToClaims(extraction?: ResearchExtraction): ProfileClaim[] {
  if (!extraction) {
    return [];
  }

  const entries: Array<[keyof ResearchExtraction, string]> = [
    ["productFamilies", "AI extracted product families"],
    ["markets", "AI extracted markets"],
    ["channels", "AI extracted channels"],
    ["geographies", "AI extracted geographies"],
    ["launches", "AI extracted launches"],
    ["buyerSegments", "AI extracted buyer segments"],
    ["industryLanguage", "AI extracted industry language"],
  ];

  return entries.flatMap(([field, label]) =>
    extraction[field].slice(0, 10).map((value, index) => ({
      id: `ai_${field}_${index + 1}`,
      field: `ai.${field}`,
      value: `${label}: ${value}`,
      sourceType: "inferred" as const,
      confidence: 0.55,
    })),
  );
}
