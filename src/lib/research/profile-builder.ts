import type { CompanyProfile, ProfileClaim, ScenarioInput } from "@/lib/domain/types";
import type { ResearchSource } from "./sources";

export function buildProfileFromSources(
  input: ScenarioInput,
  sources: ResearchSource[],
): CompanyProfile {
  const sourceClaims: ProfileClaim[] = sources.map((source, index) => {
    const isLowConfidenceSource =
      source.url === "about:blank" || source.id === "source_company_homepage_unavailable";

    return {
      id: `public_claim_${index + 1}`,
      field: "source",
      value: `Public source reviewed: ${source.title}`,
      sourceType: "public_fact",
      confidence: isLowConfidenceSource ? 0.2 : 0.7,
      ...(source.url === "about:blank" ? {} : { sourceUrl: source.url }),
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
