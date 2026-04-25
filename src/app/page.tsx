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
        body: JSON.stringify(input),
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
        <ResearchPanel
          profile={researchProfile}
          sources={researchSources}
          isResearching={isResearching}
          error={researchError}
          onResearch={research}
        />
        <ScenarioDashboard scenario={scenario} />
        <ValidationPanel scenario={scenario} />
        <ProfileReview scenario={scenario} />
        <DataPreview scenario={scenario} />
        <ScenarioLibrary scenario={scenario} onLoad={setScenario} />
        <ExportPanel scenario={scenario} />
      </div>
    </main>
  );
}
