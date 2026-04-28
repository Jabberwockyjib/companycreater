import { describe, expect, it } from "vitest";
import { defaultScenarioInput } from "@/lib/domain/defaults";
import { extendScenarioToDate } from "@/lib/sim/versioning";
import { generateScenario } from "@/lib/sim/generate";

describe("scenario versioning", () => {
  it("extends a prior scenario from its original as-of date to a newer as-of date", () => {
    const original = generateScenario({
      ...defaultScenarioInput,
      historyYears: 1,
      asOfDate: "2026-01-28",
    });
    const updated = extendScenarioToDate(original, "2026-04-28");

    expect(updated.metadata.previousVersionId).toBe(original.metadata.versionId);
    expect(updated.metadata.asOfDate).toBe("2026-04-28");
    expect(updated.metadata.historyStartDate).toBe(original.metadata.historyStartDate);
    expect(updated.metadata.input?.asOfDate).toBe("2026-04-28");
    expect(updated.tables.monthlyRevenue[0]?.month).toBe(original.tables.monthlyRevenue[0]?.month);
    expect(updated.tables.monthlyRevenue.at(-1)?.month).toBe("2026-04");
    expect(updated.tables.orders.some((order) => order.orderDate > "2026-01-28")).toBe(true);
    expect(updated.tables.orders.every((order) => order.orderDate <= "2026-04-28")).toBe(true);
    expect(updated.tables.customers).toEqual(original.tables.customers);
    expect(
      updated.assumptionsReport.some((assumption) =>
        assumption.includes("extended from a previously saved scenario"),
      ),
    ).toBe(true);
  });
});
