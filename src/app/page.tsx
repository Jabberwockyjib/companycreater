"use client";

import { useState } from "react";
import { DataPreview } from "@/components/generator/data-preview";
import { ExportPanel } from "@/components/generator/export-panel";
import { ProfileReview } from "@/components/generator/profile-review";
import { ResearchPanel } from "@/components/generator/research-panel";
import { ScenarioDashboard } from "@/components/generator/scenario-dashboard";
import { ScenarioForm } from "@/components/generator/scenario-form";
import { ScenarioLibrary } from "@/components/generator/scenario-library";
import { ValidationPanel } from "@/components/generator/validation-panel";
import { defaultScenarioInput } from "@/lib/domain/defaults";
import type { CompanyProfile, GeneratedScenario, ScenarioInput } from "@/lib/domain/types";
import type { ResearchSource } from "@/lib/research/sources";

export default function Home() {
  const [input, setInput] = useState<ScenarioInput>(defaultScenarioInput);
  const [scenario, setScenario] = useState<GeneratedScenario | null>(null);
  const [researchProfile, setResearchProfile] = useState<CompanyProfile | null>(null);
  const [researchSources, setResearchSources] = useState<ResearchSource[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [researchError, setResearchError] = useState<string | null>(null);

  async function research() {
    setIsResearching(true);
    setResearchError(null);

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        setResearchError("Research input is outside the supported MVP bounds.");
        return;
      }

      const payload = (await response.json()) as {
        profile: CompanyProfile;
        sources: ResearchSource[];
      };
      setResearchProfile(payload.profile);
      setResearchSources(payload.sources);
    } catch {
      setResearchError("Research failed.");
    } finally {
      setIsResearching(false);
    }
  }

  async function generate() {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          researchProfile && input.mode === "real_company"
            ? { input, researchProfile }
            : input,
        ),
      });

      if (!response.ok) {
        setError("Scenario input is outside the supported MVP bounds.");
        return;
      }

      const generatedScenario = (await response.json()) as GeneratedScenario;
      const mergedScenario =
        researchProfile && input.mode === "real_company"
          ? {
              ...generatedScenario,
              profile: {
                ...generatedScenario.profile,
                claims: [
                  ...researchProfile.claims,
                  ...generatedScenario.profile.claims.filter(
                    (claim) => !researchProfile.claims.some((item) => item.id === claim.id),
                  ),
                ],
              },
              assumptionsReport: [
                ...generatedScenario.assumptionsReport,
                "Public research context was attached as labeled profile claims. Generated operating data remains synthetic.",
              ],
            }
          : generatedScenario;

      setScenario(mergedScenario);
    } catch {
      setError("Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  const aiClaimCount =
    researchProfile?.claims.filter((claim) => claim.field.startsWith("ai.")).length ?? 0;
  const scenarioStatus = scenario ? "Scenario ready" : isGenerating ? "Generating" : "No run yet";

  return (
    <main className="min-h-screen bg-[#f4f7f7] text-slate-950">
      <div className="border-b border-slate-200 bg-white/95 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
        <header className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-lg font-semibold text-white shadow-sm">
              SD
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Sales Data Generator</h1>
              <p className="text-xs text-slate-500">CRM · BI · ERP synthetic data workbench</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill label="AI Research" value={isResearching ? "Running" : "Ready"} active />
            <StatusPill label="AI Claims" value={aiClaimCount.toLocaleString()} />
            <StatusPill label="Data Engine" value={scenarioStatus} />
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
              $25M-$200M revenue · public facts labeled
            </div>
          </div>
        </header>
      </div>

      <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6">
        <div className="grid gap-4 xl:grid-cols-[290px_minmax(0,1fr)_320px]">
          <aside>
            <ScenarioForm
              value={input}
              isGenerating={isGenerating}
              error={error}
              onChange={setInput}
              onGenerate={generate}
            />
          </aside>
          <section className="grid gap-4">
            <ScenarioDashboard scenario={scenario} />
            <DataPreview scenario={scenario} />
            <ProfileReview scenario={scenario} />
          </section>
          <aside>
            <ResearchPanel
              profile={researchProfile}
              sources={researchSources}
              isResearching={isResearching}
              error={researchError}
              onResearch={research}
            />
          </aside>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px_420px]">
          <ValidationPanel scenario={scenario} />
          <ScenarioLibrary scenario={scenario} onLoad={setScenario} />
          <ExportPanel scenario={scenario} />
        </div>
      </div>
    </main>
  );
}

function StatusPill({ label, value, active = false }: { label: string; value: string; active?: boolean }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <div className="text-slate-500">{label}</div>
      <div className="mt-0.5 flex items-center gap-1.5 font-medium text-slate-900">
        {active ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> : null}
        {value}
      </div>
    </div>
  );
}
