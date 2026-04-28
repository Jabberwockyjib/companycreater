import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { defaultScenarioInput } from "@/lib/domain/defaults";
import { ScenarioStore } from "@/lib/persistence/scenario-store";
import { generateScenario } from "@/lib/sim/generate";

describe("ScenarioStore", () => {
  it("saves, lists, and loads generated scenarios", () => {
    const dbPath = path.join(mkdtempSync(path.join(tmpdir(), "scenario-store-")), "test.sqlite");
    const store = new ScenarioStore(dbPath);
    const scenario = generateScenario(defaultScenarioInput);

    const saved = store.save(scenario);
    const list = store.list();
    const loaded = store.find(scenario.metadata.scenarioId);

    expect(saved.scenarioGroupId).toBe(scenario.metadata.scenarioId);
    expect(saved.id).toBe(`${scenario.metadata.scenarioId}_v1`);
    expect(list).toHaveLength(1);
    expect(list[0]?.customerCount).toBe(scenario.tables.customers.length);
    expect(loaded?.scenario.metadata.scenarioId).toBe(scenario.metadata.scenarioId);
    expect(loaded?.bookedRevenue).toBeGreaterThan(0);

    store.close();
  });

  it("saves repeated runs as versions without overwriting earlier data", () => {
    const dbPath = path.join(mkdtempSync(path.join(tmpdir(), "scenario-store-")), "test.sqlite");
    const store = new ScenarioStore(dbPath);
    const scenario = generateScenario(defaultScenarioInput);
    const first = store.save(scenario);
    const second = store.save({
      ...scenario,
      profile: { ...scenario.profile, industry: "Packaging Materials" },
    });

    expect(store.list()).toHaveLength(2);
    expect(first.versionNumber).toBe(1);
    expect(second.versionNumber).toBe(2);
    expect(second.scenarioGroupId).toBe(first.scenarioGroupId);
    expect(second.id).not.toBe(first.id);
    expect(store.find(first.id)?.industry).toBe(defaultScenarioInput.industry);
    expect(second.industry).toBe("Packaging Materials");

    store.close();
  });
});
