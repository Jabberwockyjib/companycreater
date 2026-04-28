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
});
