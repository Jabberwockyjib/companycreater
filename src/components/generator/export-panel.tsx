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
    <section className="flex flex-col gap-3 rounded-md border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-sm font-semibold">Export</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Download CSV files, JSON bundle, and the assumptions report.
        </p>
        {status ? <p className="mt-1 text-xs text-zinc-500">{status}</p> : null}
      </div>
      <Button disabled={!scenario} onClick={exportScenario}>
        Export ZIP
      </Button>
    </section>
  );
}
