import type { CompanyProfile } from "@/lib/domain/types";
import type { ResearchSource } from "@/lib/research/sources";
import { Button } from "@/components/ui/button";

interface ResearchPanelProps {
  profile: CompanyProfile | null;
  sources: ResearchSource[];
  isResearching: boolean;
  error: string | null;
  canResearch: boolean;
  isRealCompany: boolean;
  onResearch: () => void;
}

export function ResearchPanel({
  profile,
  sources,
  isResearching,
  error,
  canResearch,
  isRealCompany,
  onResearch,
}: ResearchPanelProps) {
  const aiClaims = profile?.claims.filter((claim) => claim.field.startsWith("ai.")) ?? [];
  const publicSources = sources.filter((source) => source.sourceType === "public_web");
  const qualityScore = Math.min(99, 45 + publicSources.length * 12 + aiClaims.length * 7);

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-xs font-semibold uppercase text-slate-900">AI Research & Quality</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Pull public company context and expose what Gemini extracted.
        </p>
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        {!isRealCompany ? (
          <p className="mt-2 text-xs leading-4 text-slate-500">
            Research is used for real-company scenarios. Fictional scenarios generate directly.
          </p>
        ) : !canResearch ? (
          <p className="mt-2 text-xs leading-4 text-slate-500">
            Add a company name and website to run public research.
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 px-4 py-4">
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <div className="flex items-center gap-3">
            <div className="grid h-16 w-16 place-items-center rounded-full border-4 border-teal-600 bg-white text-xl font-semibold text-slate-950">
              {profile ? qualityScore : "--"}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {profile ? "Research complete" : isResearching ? "Research running" : "Awaiting research"}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {publicSources.length} public sources · {aiClaims.length} AI claims
              </div>
            </div>
          </div>
        </div>

        <div>
          <Button
            className="w-full bg-teal-700 hover:bg-teal-800"
            onClick={onResearch}
            disabled={isResearching || !canResearch}
          >
            {isResearching ? "Researching" : "Research Company"}
          </Button>
        </div>
      </div>

      {profile ? (
        <div className="grid gap-3 border-t border-slate-100 px-4 py-4">
          <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
            <div className="text-xs font-medium uppercase text-slate-500">Profile</div>
            <div className="mt-1 text-sm font-medium text-slate-900">{profile.companyName}</div>
            <div className="text-sm text-slate-600">{profile.industry}</div>
            <div className="mt-2 text-xs text-slate-500">{profile.claims.length} profile claims</div>
            {aiClaims.length ? (
              <div className="mt-3">
                <div className="text-xs font-medium uppercase text-slate-500">AI Extracted</div>
                <ul className="mt-2 grid gap-1.5 text-sm text-slate-700">
                  {aiClaims.slice(0, 8).map((claim) => (
                    <li key={claim.id} className="rounded border border-teal-100 bg-white px-2 py-1">
                      {claim.value}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-2 py-2 text-xs text-amber-800">
                No AI extraction claims were returned from the current sources.
              </div>
            )}
          </div>
          <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
            <div className="text-xs font-medium uppercase text-slate-500">Sources</div>
            <div className="mt-2 grid gap-2">
              {sources.map((source) => (
                <div key={source.id} className="text-sm">
                  <div className="font-medium text-slate-800">{source.title}</div>
                  <div className="break-all text-xs text-slate-500">
                    {source.sourceType}
                    {source.url ? ` · ${source.url}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
