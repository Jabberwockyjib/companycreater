import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as getScenario } from "@/app/api/scenarios/[id]/route";
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
});
