import type { ResearchExtraction } from "@/lib/model/types";
import type { ResearchSource } from "./sources";

const EMPTY_EXTRACTION: ResearchExtraction = {
  productFamilies: [],
  markets: [],
  channels: [],
  geographies: [],
  launches: [],
  buyerSegments: [],
  industryLanguage: [],
};

const PRODUCT_PHRASES = [
  "Enclosed Drives",
  "Open Gearing",
  "Custom Drives",
  "Field Service & Rebuilds",
  "Modular Gear Products",
  "M Series Worm Gear Drives",
  "S Series Stainless Steel Worm Gear Drives",
  "WG Series Worm Gear Drives",
  "RM Series Helical Ratio Multipliers",
  "Millennium Series",
  "AF & RF Series",
  "Helical Shaft Mounts",
  "Screw Conveyor Drives",
  "Parallel Shaft Drives",
  "Standard Worm Gear Sets",
  "Custom Enclosed Drives",
  "Dimensional Replacement Gear Drives",
  "Gear Drive Refurbishments",
  "Speed Reducers",
  "Helical Ratio Multipliers",
  "Worm Gear Drives",
] as const;

const MARKET_PHRASES = [
  "Steel Production and Processing",
  "Steel Production",
  "Mineral Processing",
  "Material Handling",
  "Overhead Cranes",
  "Rubber Production",
  "Movable Bridges",
  "Paper Mills",
  "Oil",
  "Lumber",
  "Airport",
  "Mass Transit",
] as const;

const INDUSTRY_LANGUAGE_PHRASES = [
  "Gear Hobs",
  "Output Torque",
  "Gear Drives",
  "Speed Reducers",
  "Helical",
  "Bevel",
  "Spur",
  "Planetary",
  "Worm Gear",
  "Case Hardened",
  "Precision Ground",
  "Refurbishments",
] as const;

const BROAD_PRODUCT_FAMILIES = new Set(["gear", "gears", "product", "products", "service", "services"]);

export function extractResearchSignalsFromSources(sources: ResearchSource[]): ResearchExtraction {
  const sourceText = sources
    .filter((source) => source.sourceType === "public_web")
    .map((source) => source.text)
    .join(" ");

  if (!sourceText) {
    return { ...EMPTY_EXTRACTION };
  }

  return {
    productFamilies: findKnownPhrases(sourceText, PRODUCT_PHRASES),
    markets: findKnownPhrases(sourceText, MARKET_PHRASES),
    channels: findKnownPhrases(sourceText, ["Distributor", "Distributors", "OEM"] as const),
    geographies: findKnownPhrases(sourceText, ["Cleveland", "North America"] as const),
    launches: [],
    buyerSegments: findKnownPhrases(sourceText, [
      "Industrial Customers",
      "Machine Designers",
      "Engineering",
      "Procurement",
      "Plant Operations",
      "Maintenance Teams",
    ] as const),
    industryLanguage: findKnownPhrases(sourceText, INDUSTRY_LANGUAGE_PHRASES),
  };
}

export function mergeResearchExtractions(
  deterministic: ResearchExtraction | undefined,
  model: ResearchExtraction | undefined,
): ResearchExtraction {
  const base = deterministic ?? EMPTY_EXTRACTION;
  const supplement = model ?? EMPTY_EXTRACTION;

  return {
    productFamilies: mergeValues(base.productFamilies, supplement.productFamilies, {
      dropBroadValues: base.productFamilies.length > 1,
    }),
    markets: mergeValues(base.markets, supplement.markets),
    channels: mergeValues(base.channels, supplement.channels),
    geographies: mergeValues(base.geographies, supplement.geographies),
    launches: mergeValues(base.launches, supplement.launches),
    buyerSegments: mergeValues(base.buyerSegments, supplement.buyerSegments),
    industryLanguage: mergeValues(base.industryLanguage, supplement.industryLanguage),
  };
}

function findKnownPhrases<const T extends readonly string[]>(sourceText: string, phrases: T): string[] {
  const normalizedSource = normalizeForSearch(sourceText);

  return phrases.filter((phrase) => normalizedSource.includes(normalizeForSearch(phrase)));
}

function mergeValues(
  first: string[],
  second: string[],
  options: { dropBroadValues?: boolean } = {},
): string[] {
  const values = [...first, ...second]
    .map((value) => normalizeValue(value))
    .filter((value): value is string => Boolean(value))
    .filter((value) => !options.dropBroadValues || !BROAD_PRODUCT_FAMILIES.has(value.toLowerCase()));
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const value of values) {
    const key = normalizeForSearch(value);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(value);
  }

  return merged.slice(0, 20);
}

function normalizeValue(value: string): string | undefined {
  const normalized = value.replace(/\s+/g, " ").replace(/[.。]+$/g, "").trim();

  return normalized.length >= 2 ? normalized : undefined;
}

function normalizeForSearch(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
