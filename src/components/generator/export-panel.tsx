"use client";

import { useState } from "react";
import type { GeneratedScenario } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";

export function ExportPanel({ scenario }: { scenario: GeneratedScenario | null }) {
  const [status, setStatus] = useState<string | null>(null);

  async function exportScenario() {
    if (!scenario) {
      return;
    }

    setStatus("Preparing ZIP");
    const response = await fetch("/api/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(scenario),
    });

    if (!response.ok) {
      setStatus("Export failed");
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${scenario.metadata.scenarioId}.zip`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("ZIP ready");
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-xs font-semibold uppercase text-slate-900">Export</h2>
        <p className="mt-2 text-sm text-slate-600">
          Download CSV files, JSON bundle, and the assumptions report.
        </p>
        {scenario ? (
          <p className="mt-1 text-xs text-slate-500">
            Includes {Object.keys(scenario.tables).length} tables and{" "}
            {scenario.tables.orders.length.toLocaleString()} orders.
          </p>
        ) : null}
        {status ? <p className="mt-2 text-xs text-emerald-700">{status}</p> : null}
      </div>
      <Button className="mt-4 w-full bg-teal-700 hover:bg-teal-800" disabled={!scenario} onClick={exportScenario}>
        Export ZIP
      </Button>
    </section>
  );
}
