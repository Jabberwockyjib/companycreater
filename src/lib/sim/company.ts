import type { CompanyProfile, ScenarioInput } from "@/lib/domain/types";

export function buildCompanyProfile(input: ScenarioInput): CompanyProfile {
  return {
    companyName: input.companyName,
    industry: input.industry,
    revenueTarget: input.revenueTarget,
    regions: input.regions,
    channels: input.channels,
    claims: [
      {
        id: "claim_revenue_target",
        field: "revenueTarget",
        value: String(input.revenueTarget),
        sourceType: "user_assumption",
        confidence: 1,
      },
      {
        id: "claim_private_operating_data",
        field: "privateOperatingData",
        value: "Generated private operating tables are synthetic.",
        sourceType: "synthetic",
        confidence: 1,
      },
    ],
  };
}
