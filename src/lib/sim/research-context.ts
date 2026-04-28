import type { CompanyProfile } from "@/lib/domain/types";

export interface ResearchContext {
  productFamilies: string[];
  markets: string[];
  channels: string[];
  geographies: string[];
  launches: string[];
  buyerSegments: string[];
  industryLanguage: string[];
}

const RESEARCH_FIELDS = {
  productFamilies: "ai.productFamilies",
  markets: "ai.markets",
  channels: "ai.channels",
  geographies: "ai.geographies",
  launches: "ai.launches",
  buyerSegments: "ai.buyerSegments",
  industryLanguage: "ai.industryLanguage",
} as const;

export function buildResearchContext(profile?: CompanyProfile): ResearchContext {
  return {
    productFamilies: extractClaimValues(profile, RESEARCH_FIELDS.productFamilies),
    markets: extractClaimValues(profile, RESEARCH_FIELDS.markets),
    channels: extractClaimValues(profile, RESEARCH_FIELDS.channels),
    geographies: extractClaimValues(profile, RESEARCH_FIELDS.geographies),
    launches: extractClaimValues(profile, RESEARCH_FIELDS.launches),
    buyerSegments: extractClaimValues(profile, RESEARCH_FIELDS.buyerSegments),
    industryLanguage: extractClaimValues(profile, RESEARCH_FIELDS.industryLanguage),
  };
}

export function pickResearchSignal(values: string[], index: number): string | undefined {
  return values.length > 0 ? values[index % values.length] : undefined;
}

function extractClaimValues(profile: CompanyProfile | undefined, field: string): string[] {
  if (!profile) {
    return [];
  }

  return [
    ...new Set(
      profile.claims
        .filter((claim) => claim.field === field)
        .map((claim) => normalizeClaimValue(claim.value))
        .filter((value): value is string => Boolean(value)),
    ),
  ].slice(0, 20);
}

function normalizeClaimValue(value: string): string | undefined {
  const rawValue = value.includes(":") ? value.split(":").at(-1) : value;
  const normalized = rawValue
    ?.replace(/\s+/g, " ")
    .replace(/[.。]+$/g, "")
    .trim();

  return normalized && normalized.length >= 2 ? normalized.slice(0, 100) : undefined;
}
