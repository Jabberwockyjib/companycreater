import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/research/route";
import { defaultScenarioInput } from "@/lib/domain/defaults";

describe("/api/research", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns field-level details for invalid research input", async () => {
    const response = await POST(
      new Request("http://localhost/api/research", {
        method: "POST",
        body: JSON.stringify({ ...defaultScenarioInput, revenueTarget: 1_000_000 }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Invalid research input");
    expect(payload.details).toContain("Revenue target must be between $25M and $200M.");
  });

  it("adds Gemini research extraction claims when AI research is enabled", async () => {
    vi.stubEnv("LLM_PROVIDER", "gemini");
    vi.stubEnv("LLM_MODEL", "gemini-test-model");
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        text: JSON.stringify({
                          productFamilies: ["Specialty sealants"],
                          markets: ["Industrial maintenance"],
                          channels: ["Distributor"],
                          geographies: ["North America"],
                          launches: ["Low-VOC line"],
                          buyerSegments: ["Plant operations"],
                          industryLanguage: ["MRO"],
                        }),
                      },
                    ],
                  },
                },
              ],
              usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 15 },
            }),
            { status: 200 },
          ),
      ),
    );

    const response = await POST(
      new Request("http://localhost/api/research", {
        method: "POST",
        body: JSON.stringify({ ...defaultScenarioInput, companyUrl: "" }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.profile.claims).toContainEqual(
      expect.objectContaining({
        field: "ai.productFamilies",
        value: "AI extracted product families: Specialty sealants",
      }),
    );
    expect(payload.profile.claims).toContainEqual(
      expect.objectContaining({
        field: "ai.buyerSegments",
        value: "AI extracted buyer segments: Plant operations",
      }),
    );
  });

  it("adds catalog families from public sources when Gemini returns timid product signals", async () => {
    vi.stubEnv("LLM_PROVIDER", "gemini");
    vi.stubEnv("LLM_MODEL", "gemini-test-model");
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "https://www.clevelandgear.com/") {
          return new Response(
            `
              <main>
                <a href="/products-services/">Products and Services</a>
              </main>
            `,
            { status: 200 },
          );
        }

        if (url === "https://www.clevelandgear.com/products-services/") {
          return new Response(
            `
              <main>
                Products & Services
                Enclosed Drives Open Gearing Custom Drives Field Service & Rebuilds
                M Series worm gear drives WG Series worm gear drives RM Series Helical Ratio Multipliers
                Helical Shaft Mounts and Screw Conveyor Drives Parallel Shaft Drives
                Standard Worm Gear Sets and dimensional replacement gear drives.
              </main>
            `,
            { status: 200 },
          );
        }

        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        productFamilies: ["Gears"],
                        markets: [],
                        channels: [],
                        geographies: [],
                        launches: [],
                        buyerSegments: [],
                        industryLanguage: [],
                      }),
                    },
                  ],
                },
              },
            ],
            usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 15 },
          }),
          { status: 200 },
        );
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/research", {
        method: "POST",
        body: JSON.stringify({
          ...defaultScenarioInput,
          mode: "real_company",
          companyName: "Cleveland Gear",
          companyUrl: "https://www.clevelandgear.com",
        }),
      }),
    );
    const payload = await response.json();
    const productFamilyClaims = payload.profile.claims.filter(
      (claim: { field: string }) => claim.field === "ai.productFamilies",
    );

    expect(response.status).toBe(200);
    expect(productFamilyClaims).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: "AI extracted product families: Enclosed Drives" }),
        expect.objectContaining({ value: "AI extracted product families: Open Gearing" }),
        expect.objectContaining({ value: "AI extracted product families: Custom Drives" }),
        expect.objectContaining({ value: "AI extracted product families: RM Series Helical Ratio Multipliers" }),
      ]),
    );
    expect(productFamilyClaims).not.toContainEqual(
      expect.objectContaining({ value: "AI extracted product families: Gears" }),
    );
  });
});
