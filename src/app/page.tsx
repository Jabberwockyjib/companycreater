"use client";

import { useState } from "react";
import { DataPreview } from "@/components/generator/data-preview";
import { ExportPanel } from "@/components/generator/export-panel";
import { ProfileReview } from "@/components/generator/profile-review";
import { ScenarioDashboard } from "@/components/generator/scenario-dashboard";
import { ScenarioForm } from "@/components/generator/scenario-form";
import { ValidationPanel } from "@/components/generator/validation-panel";
import { defaultScenarioInput } from "@/lib/domain/defaults";
import type { GeneratedScenario, ScenarioInput } from "@/lib/domain/types";

export default function Home() {
  const [input, setInput] = useState<ScenarioInput>(defaultScenarioInput);
  const [scenario, setScenario] = useState<GeneratedScenario | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        setError("Scenario input is outside the supported MVP bounds.");
        return;
      }

      setScenario((await response.json()) as GeneratedScenario);
    } catch {
      setError("Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6">
        <header className="border-b border-zinc-200 pb-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Sales Data Generator</h1>
              <p className="mt-1 max-w-3xl text-sm text-zinc-600">
                Generate synthetic CRM, BI, and sales operations data for B2B product
                companies.
              </p>
            </div>
            <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 shadow-sm">
              $25M-$200M revenue · CRM/BI first · ERP-visible effects
            </div>
          </div>
        </header>

        <ScenarioForm
          value={input}
          isGenerating={isGenerating}
          error={error}
          onChange={setInput}
          onGenerate={generate}
        />
        <ScenarioDashboard scenario={scenario} />
        <ValidationPanel scenario={scenario} />
        <ProfileReview scenario={scenario} />
        <DataPreview scenario={scenario} />
        <ExportPanel scenario={scenario} />
      </div>
    </main>
  );
}
