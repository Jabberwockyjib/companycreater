import { describe, expect, it } from "vitest";
import { extractResearchSignalsFromSources, mergeResearchExtractions } from "@/lib/research/extraction";
import type { ResearchSource } from "@/lib/research/sources";

const clevelandGearSources: ResearchSource[] = [
  {
    id: "source_company_page_1",
    title: "Cleveland Gear",
    sourceType: "public_web",
    retrievedAt: "2026-04-28T00:00:00.000Z",
    url: "https://www.clevelandgear.com/products-services/",
    text: [
      "Products & Services Enclosed Drives Open Gearing Custom Drives Field Service & Rebuilds",
      "Modular Gear Products M Series worm gear drives S Series stainless steel worm gear drives WG Series worm gear drives RM Series Helical Ratio Multipliers",
      "Larger Enclosed Drive Products Millennium Series AF & RF Series",
      "Helical Shaft Mounts and Screw Conveyor Drives Parallel Shaft Drives",
      "Standard Worm Gear Sets catalog for over 1,500 stock gear hobs.",
      "High Quality Custom Drives Cleveland Gear designs custom enclosed drives and dimensional replacement gear drives.",
      "Single and multiple speed drives with helical, bevel, spur, planetary or worm gear designs.",
      "Field Service & Rebuilds Gear Drive Refurbishments",
      "Industries include steel production and processing, mineral processing, material handling, and overhead cranes.",
    ].join(" "),
  },
];

describe("research extraction", () => {
  it("extracts rich catalog and service families from public source text", () => {
    const extraction = extractResearchSignalsFromSources(clevelandGearSources);

    expect(extraction.productFamilies).toEqual(
      expect.arrayContaining([
        "Enclosed Drives",
        "Open Gearing",
        "Custom Drives",
        "Field Service & Rebuilds",
        "M Series Worm Gear Drives",
        "WG Series Worm Gear Drives",
        "RM Series Helical Ratio Multipliers",
        "Helical Shaft Mounts",
        "Screw Conveyor Drives",
        "Parallel Shaft Drives",
        "Standard Worm Gear Sets",
        "Dimensional Replacement Gear Drives",
        "Gear Drive Refurbishments",
      ]),
    );
    expect(extraction.markets).toEqual(
      expect.arrayContaining(["Steel Production and Processing", "Mineral Processing", "Material Handling"]),
    );
    expect(extraction.industryLanguage).toEqual(
      expect.arrayContaining(["Gear Hobs", "Helical", "Bevel", "Spur", "Planetary", "Worm Gear"]),
    );
  });

  it("merges deterministic public signals ahead of timid model output", () => {
    const merged = mergeResearchExtractions(
      extractResearchSignalsFromSources(clevelandGearSources),
      {
        productFamilies: ["Gears"],
        markets: [],
        channels: [],
        geographies: [],
        launches: [],
        buyerSegments: [],
        industryLanguage: [],
      },
    );

    expect(merged.productFamilies.slice(0, 4)).toEqual([
      "Enclosed Drives",
      "Open Gearing",
      "Custom Drives",
      "Field Service & Rebuilds",
    ]);
    expect(merged.productFamilies).not.toContain("Gears");
  });
});
