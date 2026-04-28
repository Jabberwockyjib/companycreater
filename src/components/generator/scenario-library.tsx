"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { GeneratedScenario } from "@/lib/domain/types";
import { formatCurrency } from "@/lib/format";

interface ScenarioSummary {
  id: string;
  scenarioGroupId: string;
  versionNumber: number;
  parentVersionId?: string;
  companyName: string;
  industry: string;
  mode: string;
  asOfDate?: string;
  historyStartDate?: string;
  createdAt: string;
  updatedAt: string;
  customerCount: number;
  orderCount: number;
  bookedRevenue: number;
}

interface StoredScenario extends ScenarioSummary {
  scenario: GeneratedScenario;
}

export function ScenarioLibrary({
  scenario,
  onLoad,
}: {
  scenario: GeneratedScenario | null;
  onLoad: (scenario: GeneratedScenario) => void;
}) {
  const [summaries, setSummaries] = useState<ScenarioSummary[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function refreshLibrary() {
    setStatus("Loading saved scenarios");

    try {
      const response = await fetch("/api/scenarios");

      if (!response.ok) {
        setStatus("Library load failed");
        return;
      }

      const payload = (await response.json()) as { scenarios: ScenarioSummary[] };
      setSummaries(payload.scenarios);
      setStatus(payload.scenarios.length ? "Library loaded" : "No saved scenarios yet");
    } catch {
      setStatus("Library load failed");
    }
  }

  async function saveScenario() {
    if (!scenario) {
      return;
    }

    setIsSaving(true);
    setStatus("Saving scenario");

    try {
      const response = await fetch("/api/scenarios", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(scenario),
      });

      if (!response.ok) {
        setStatus("Scenario save failed");
        return;
      }

      const payload = (await response.json()) as { scenario: StoredScenario };
      onLoad(payload.scenario.scenario);
      await refreshLibrary();
      setStatus("Scenario saved");
    } catch {
      setStatus("Scenario save failed");
    } finally {
      setIsSaving(false);
    }
  }

  async function loadScenario(id: string) {
    setLoadingId(id);
    setStatus("Loading scenario");

    try {
      const response = await fetch(`/api/scenarios/${encodeURIComponent(id)}`);

      if (!response.ok) {
        setStatus("Scenario load failed");
        return;
      }

      const payload = (await response.json()) as { scenario: StoredScenario };
      onLoad(payload.scenario.scenario);
      setStatus("Scenario loaded");
    } catch {
      setStatus("Scenario load failed");
    } finally {
      setLoadingId(null);
    }
  }

  async function updateScenario(id: string) {
    setUpdatingId(id);
    setStatus("Updating scenario to today");

    try {
      const response = await fetch(`/api/scenarios/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ asOfDate: new Date().toISOString().slice(0, 10) }),
      });

      if (!response.ok) {
        setStatus("Scenario update failed");
        return;
      }

      const payload = (await response.json()) as { scenario: StoredScenario };
      onLoad(payload.scenario.scenario);
      await refreshLibrary();
      setStatus("Scenario updated as a new version");
    } catch {
      setStatus("Scenario update failed");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase text-slate-900">Scenario Library</h2>
          <p className="mt-2 text-sm text-slate-600">
            Save multiple versions of a company scenario, reload a prior version, or extend a
            saved run forward to today.
          </p>
          {status ? <p className="mt-1 text-xs text-slate-500">{status}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className="border-slate-200 bg-white !text-slate-900 hover:bg-slate-100"
            onClick={refreshLibrary}
          >
            Refresh
          </Button>
          <Button disabled={!scenario || isSaving} onClick={saveScenario}>
            {isSaving ? "Saving" : "Save Scenario"}
          </Button>
        </div>
      </div>

      {summaries.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-4 font-medium">Company</th>
                <th className="py-2 pr-4 font-medium">Version</th>
                <th className="py-2 pr-4 font-medium">As Of</th>
                <th className="py-2 pr-4 font-medium">Industry</th>
                <th className="py-2 pr-4 font-medium">Revenue</th>
                <th className="py-2 pr-4 font-medium">Customers</th>
                <th className="py-2 pr-4 font-medium">Orders</th>
                <th className="py-2 pr-4 font-medium">Updated</th>
                <th className="py-2 pr-0 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summaries.map((item) => (
                <tr key={item.id}>
                  <td className="py-2 pr-4 font-medium text-slate-900">{item.companyName}</td>
                  <td className="py-2 pr-4 text-slate-600">v{item.versionNumber}</td>
                  <td className="py-2 pr-4 text-slate-600">{item.asOfDate ?? "n/a"}</td>
                  <td className="py-2 pr-4 text-slate-600">{item.industry}</td>
                  <td className="py-2 pr-4 text-slate-600">
                    {formatCurrency(item.bookedRevenue)}
                  </td>
                  <td className="py-2 pr-4 text-slate-600">{item.customerCount}</td>
                  <td className="py-2 pr-4 text-slate-600">{item.orderCount}</td>
                  <td className="py-2 pr-4 text-slate-600">
                    {new Date(item.updatedAt).toLocaleString()}
                  </td>
                  <td className="py-2 pr-0">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        className="h-8 border-slate-200 bg-white px-2 text-xs !text-slate-900 hover:bg-slate-100"
                        disabled={loadingId === item.id}
                        onClick={() => loadScenario(item.id)}
                      >
                        {loadingId === item.id ? "Loading" : "Load"}
                      </Button>
                      <Button
                        className="h-8 border-slate-200 bg-white px-2 text-xs !text-slate-900 hover:bg-slate-100"
                        disabled={updatingId === item.id}
                        onClick={() => updateScenario(item.id)}
                      >
                        {updatingId === item.id ? "Updating" : "Update"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
