"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { GeneratedScenario } from "@/lib/domain/types";
import { formatCurrency } from "@/lib/format";

interface ScenarioSummary {
  id: string;
  companyName: string;
  industry: string;
  mode: string;
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

  return (
    <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Scenario Library</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Persist generated datasets locally and reload them for CRM, BI, or ERP
            validation runs.
          </p>
          {status ? <p className="mt-1 text-xs text-zinc-500">{status}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className="border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100"
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
            <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
              <tr>
                <th className="py-2 pr-4 font-medium">Company</th>
                <th className="py-2 pr-4 font-medium">Industry</th>
                <th className="py-2 pr-4 font-medium">Revenue</th>
                <th className="py-2 pr-4 font-medium">Customers</th>
                <th className="py-2 pr-4 font-medium">Orders</th>
                <th className="py-2 pr-4 font-medium">Updated</th>
                <th className="py-2 pr-0 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {summaries.map((item) => (
                <tr key={item.id}>
                  <td className="py-2 pr-4 font-medium text-zinc-900">{item.companyName}</td>
                  <td className="py-2 pr-4 text-zinc-600">{item.industry}</td>
                  <td className="py-2 pr-4 text-zinc-600">
                    {formatCurrency(item.bookedRevenue)}
                  </td>
                  <td className="py-2 pr-4 text-zinc-600">{item.customerCount}</td>
                  <td className="py-2 pr-4 text-zinc-600">{item.orderCount}</td>
                  <td className="py-2 pr-4 text-zinc-600">
                    {new Date(item.updatedAt).toLocaleString()}
                  </td>
                  <td className="py-2 pr-0">
                    <Button
                      className="h-8 border-zinc-300 bg-white px-2 text-xs text-zinc-900 hover:bg-zinc-100"
                      disabled={loadingId === item.id}
                      onClick={() => loadScenario(item.id)}
                    >
                      {loadingId === item.id ? "Loading" : "Load"}
                    </Button>
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
