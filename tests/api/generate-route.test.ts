import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { handleGenerateRequest, POST } from "@/app/api/generate/route";
import { defaultScenarioInput } from "@/lib/domain/defaults";

describe("POST /api/generate", () => {
  it("generates a scenario from valid input", async () => {
    const response = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        body: JSON.stringify(defaultScenarioInput),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tables.customers).toHaveLength(defaultScenarioInput.customerCount);
    expect(
      body.validations.some(
        (validation: { severity: string }) => validation.severity === "error",
      ),
    ).toBe(false);
  });

  it("accepts researched profile context for catalog generation", async () => {
    const response = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        body: JSON.stringify({
          input: { ...defaultScenarioInput, mode: "real_company", skuCount: 36 },
          researchProfile: {
            companyName: "Cleveland Gear Company",
            industry: "Industrial Components",
            revenueTarget: defaultScenarioInput.revenueTarget,
            regions: defaultScenarioInput.regions,
            channels: defaultScenarioInput.channels,
            claims: [
              {
                id: "ai_product_1",
                field: "ai.productFamilies",
                value: "AI extracted product families: Worm Gears",
                sourceType: "inferred",
                confidence: 0.55,
              },
            ],
          },
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tables.productFamilies.map((family: { name: string }) => family.name)).toContain(
      "Worm Gears",
    );
  });

  it("returns 400 for invalid input", async () => {
    const response = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        body: JSON.stringify({ ...defaultScenarioInput, revenueTarget: 1000000 }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid generation input");
    expect(body.details).toContain("Revenue target must be between $25M and $200M.");
  });

  it("returns 500 for valid input that fails internal generation", async () => {
    const response = await handleGenerateRequest(
      new Request("http://localhost/api/generate", {
        method: "POST",
        body: JSON.stringify(defaultScenarioInput),
      }),
      () => {
        throw new ZodError([]);
      },
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "Generation request failed" });
  });
});
