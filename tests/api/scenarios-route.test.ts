import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as getScenario, POST as updateScenario } from "@/app/api/scenarios/[id]/route";
import { GET, POST } from "@/app/api/scenarios/route";
import { defaultScenarioInput } from "@/lib/domain/defaults";
import { resetScenarioStoreForTests } from "@/lib/persistence/scenario-store";
import { generateScenario } from "@/lib/sim/generate";

describe("/api/scenarios", () => {
  afterEach(() => {
    resetScenarioStoreForTests();
    vi.unstubAllEnvs();
  });

  it("saves, lists, and loads scenarios", async () => {
    vi.stubEnv("SCENARIO_DB_PATH", path.join(
      mkdtempSync(path.join(tmpdir(), "scenario-route-")),
      "test.sqlite",
    ));
    const scenario = generateScenario(defaultScenarioInput);
    const saveResponse = await POST(
      new Request("http://localhost/api/scenarios", {
        method: "POST",
        body: JSON.stringify(scenario),
      }),
    );
    const listResponse = await GET();
    const loadResponse = await getScenario(new Request("http://localhost/api/scenarios/id"), {
      params: Promise.resolve({ id: scenario.metadata.scenarioId }),
    });

    expect(saveResponse.status).toBe(200);
    expect(listResponse.status).toBe(200);
    expect(loadResponse.status).toBe(200);
    expect((await listResponse.json()).scenarios).toHaveLength(1);
    expect((await loadResponse.json()).scenario.scenario.metadata.scenarioId).toBe(
      scenario.metadata.scenarioId,
    );
  });

  it("returns 400 for malformed save payloads", async () => {
    vi.stubEnv("SCENARIO_DB_PATH", path.join(
      mkdtempSync(path.join(tmpdir(), "scenario-route-")),
      "test.sqlite",
    ));
    const response = await POST(
      new Request("http://localhost/api/scenarios", {
        method: "POST",
        body: JSON.stringify({ bad: true }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("updates a saved scenario forward to a new as-of date as a new version", async () => {
    vi.stubEnv("SCENARIO_DB_PATH", path.join(
      mkdtempSync(path.join(tmpdir(), "scenario-route-")),
      "test.sqlite",
    ));
    const scenario = generateScenario({
      ...defaultScenarioInput,
      historyYears: 1,
      asOfDate: "2026-01-28",
    });
    const saveResponse = await POST(
      new Request("http://localhost/api/scenarios", {
        method: "POST",
        body: JSON.stringify(scenario),
      }),
    );
    const saved = (await saveResponse.json()).scenario;
    const updateResponse = await updateScenario(
      new Request("http://localhost/api/scenarios/id", {
        method: "POST",
        body: JSON.stringify({ asOfDate: "2026-04-28" }),
      }),
      {
        params: Promise.resolve({ id: saved.id }),
      },
    );
    const listResponse = await GET();
    const updated = (await updateResponse.json()).scenario;

    expect(updateResponse.status).toBe(200);
    expect(updated.versionNumber).toBe(2);
    expect(updated.parentVersionId).toBe(saved.id);
    expect(updated.scenario.metadata.asOfDate).toBe("2026-04-28");
    expect((await listResponse.json()).scenarios).toHaveLength(2);
  });
});
