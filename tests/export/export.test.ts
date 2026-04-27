import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/export/route";
import { defaultScenarioInput } from "@/lib/domain/defaults";
import { scenarioToCsvFiles } from "@/lib/export/csv";
import { scenarioToJsonBundle } from "@/lib/export/json";
import { scenarioToZip } from "@/lib/export/zip";
import { generateScenario } from "@/lib/sim/generate";

describe("exports", () => {
  it("creates CSV files for core tables", () => {
    const scenario = generateScenario(defaultScenarioInput);
    const files = scenarioToCsvFiles(scenario);

    expect(files["customers.csv"]).toContain("id,name,industry");
    expect(files["orders.csv"]).toContain("id,customerId,salespersonId");
    expect(files["returns.csv"]).toContain("creditAmount");
  });

  it("creates JSON bundle with assumptions report", () => {
    const scenario = generateScenario(defaultScenarioInput);
    const bundle = scenarioToJsonBundle(scenario);

    expect(bundle.scenario.metadata.scenarioId).toBe(scenario.metadata.scenarioId);
    expect(bundle.manifest.rowCounts.customers).toBe(scenario.tables.customers.length);
    expect(bundle.manifest.validationSummary.error).toBe(0);
    expect(bundle.dataDictionary.customers).toContain("Synthetic customer accounts");
    expect(bundle.assumptionsReport).toEqual(scenario.assumptionsReport);
  });

  it("creates JSON bundle with relationship metadata", () => {
    const scenario = generateScenario(defaultScenarioInput);
    const bundle = scenarioToJsonBundle(scenario);

    expect(bundle.manifest.relationships.primaryKeys).toMatchObject({
      customers: ["id"],
      orders: ["id"],
      orderLineItems: ["id"],
    });
    expect(bundle.manifest.relationships.foreignKeys).toEqual(
      expect.arrayContaining([
        {
          table: "orders",
          column: "customerId",
          references: { table: "customers", column: "id" },
        },
        {
          table: "orders",
          column: "salespersonId",
          references: { table: "salespeople", column: "id" },
        },
        {
          table: "orders",
          column: "opportunityId",
          references: { table: "opportunities", column: "id" },
        },
        {
          table: "orderLineItems",
          column: "orderId",
          references: { table: "orders", column: "id" },
        },
        {
          table: "orderLineItems",
          column: "skuId",
          references: { table: "skus", column: "id" },
        },
        {
          table: "skus",
          column: "familyId",
          references: { table: "productFamilies", column: "id" },
        },
        {
          table: "returns",
          column: "orderLineItemId",
          references: { table: "orderLineItems", column: "id" },
        },
        {
          table: "rejections",
          column: "orderLineItemId",
          references: { table: "orderLineItems", column: "id" },
        },
        {
          table: "credits",
          column: "customerId",
          references: { table: "customers", column: "id" },
        },
      ]),
    );
  });

  it("packages CSV, JSON, and assumptions report into a zip", async () => {
    const scenario = generateScenario(defaultScenarioInput);
    const zipBytes = await scenarioToZip(scenario);
    const zip = await JSZip.loadAsync(zipBytes);

    expect(zip.file("csv/customers.csv")).toBeTruthy();
    expect(zip.file("scenario.json")).toBeTruthy();
    expect(zip.file("manifest.json")).toBeTruthy();
    expect(zip.file("assumptions_report.txt")).toBeTruthy();
  });

  it("returns a zip from the export route", async () => {
    const scenario = generateScenario(defaultScenarioInput);
    const response = await POST(
      new Request("http://localhost/api/export", {
        method: "POST",
        body: JSON.stringify(scenario),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/zip");
    expect(response.headers.get("content-disposition")).toContain(
      `${scenario.metadata.scenarioId}.zip`,
    );
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(100);
  });

  it("returns 400 for malformed export payloads", async () => {
    const response = await POST(
      new Request("http://localhost/api/export", {
        method: "POST",
        body: JSON.stringify({ scenario: "not valid" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid export input" });
  });
});
