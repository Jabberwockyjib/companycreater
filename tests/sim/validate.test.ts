import { describe, expect, it } from "vitest";
import { defaultScenarioInput } from "@/lib/domain/defaults";
import { generateScenario } from "@/lib/sim/generate";
import { validateScenario } from "@/lib/sim/validate";

describe("validateScenario", () => {
  it("reconciles generated booked revenue within the MVP tolerance", () => {
    const scenario = generateScenario(defaultScenarioInput);
    const validations = validateScenario(scenario, defaultScenarioInput);

    expect(validations.some((message) => message.code === "revenue_reconciled")).toBe(true);
    expect(validations.some((message) => message.severity === "error")).toBe(false);
  });

  it("reports order line items that reference missing orders", () => {
    const scenario = generateScenario(defaultScenarioInput);
    scenario.tables.orderLineItems[0].orderId = "missing_order";

    const validations = validateScenario(scenario, defaultScenarioInput);

    expect(
      validations.some(
        (message) =>
          message.code === "missing_order_reference" && message.severity === "error",
      ),
    ).toBe(true);
  });

  it("reports credits that fall outside the monthly revenue horizon", () => {
    const scenario = generateScenario(defaultScenarioInput);
    scenario.tables.credits[0].creditDate = "2099-01-01";

    const validations = validateScenario(scenario, defaultScenarioInput);

    expect(
      validations.some(
        (message) => message.code === "missing_credit_month" && message.severity === "error",
      ),
    ).toBe(true);
  });
});
