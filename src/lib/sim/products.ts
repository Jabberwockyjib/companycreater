import type { CompanyProfile, ProductFamily, ScenarioInput, Sku } from "@/lib/domain/types";
import type { SeededRandom } from "./random";

const FAMILY_NAMES = [
  "Core Components",
  "Precision Assemblies",
  "Service Parts",
  "Configured Systems",
  "Specialty Kits",
  "Aftermarket Supplies",
] as const;

const MARGIN_BANDS = ["low", "medium", "high"] as const;
const LIFECYCLE_STATUSES = ["active", "new_launch", "discontinued"] as const;

export function generateProducts(
  input: ScenarioInput,
  random: SeededRandom,
  profile?: CompanyProfile,
): {
  productFamilies: ProductFamily[];
  skus: Sku[];
} {
  const researchedFamilyNames = extractResearchedFamilyNames(profile);
  const fallbackFamilyNames = FAMILY_NAMES.filter((name) => !researchedFamilyNames.includes(name));
  const familyCount = Math.min(
    Math.max(FAMILY_NAMES.length, researchedFamilyNames.length),
    Math.max(3, Math.ceil(input.skuCount / 35), researchedFamilyNames.length),
  );
  const familyNames = [...researchedFamilyNames, ...fallbackFamilyNames].slice(0, familyCount);
  const productFamilies = Array.from({ length: familyCount }, (_, index): ProductFamily => ({
    id: `family_${index + 1}`,
    name: familyNames[index] ?? `Product Family ${index + 1}`,
    marginBand: MARGIN_BANDS[index % MARGIN_BANDS.length],
    seasonalityWeight: round(input.seasonality === "high" ? random.money(0.75, 1.45) : random.money(0.9, 1.2)),
  }));

  const skus = Array.from({ length: input.skuCount }, (_, index): Sku => {
    const family = productFamilies[index % productFamilies.length] as ProductFamily;
    const unitPrice = random.money(80, 4200);
    const margin = family.marginBand === "high" ? random.money(0.5, 0.68) : family.marginBand === "medium" ? random.money(0.32, 0.48) : random.money(0.18, 0.3);

    return {
      id: `sku_${index + 1}`,
      skuCode: `SKU-${String(index + 1).padStart(4, "0")}`,
      name: `${family.name} ${String(index + 1).padStart(3, "0")}`,
      familyId: family.id,
      unitPrice,
      unitCost: round(unitPrice * (1 - margin)),
      launchDate: `${input.startYear - random.int(0, 3)}-${String(random.int(1, 12)).padStart(2, "0")}-01`,
      lifecycleStatus: index < Math.ceil(input.skuCount * 0.08) ? "new_launch" : random.pick(LIFECYCLE_STATUSES),
    };
  });

  return { productFamilies, skus };
}

function extractResearchedFamilyNames(profile?: CompanyProfile): string[] {
  if (!profile) {
    return [];
  }

  return [
    ...new Set(
      profile.claims
        .filter((claim) => claim.field === "ai.productFamilies")
        .map((claim) => normalizeProductFamilyName(claim.value))
        .filter((value): value is string => Boolean(value)),
    ),
  ].slice(0, 8);
}

function normalizeProductFamilyName(value: string): string | undefined {
  const rawName = value.includes(":") ? value.split(":").at(-1) : value;
  const normalized = rawName
    ?.replace(/\s+/g, " ")
    .replace(/[.。]+$/g, "")
    .trim();

  if (!normalized || normalized.length < 2) {
    return undefined;
  }

  return normalized.slice(0, 80);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
