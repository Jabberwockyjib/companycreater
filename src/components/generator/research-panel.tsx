import type { CompanyProfile } from "@/lib/domain/types";
import type { ResearchSource } from "@/lib/research/sources";
import { Button } from "@/components/ui/button";

interface ResearchPanelProps {
  profile: CompanyProfile | null;
  sources: ResearchSource[];
  isResearching: boolean;
  error: string | null;
  onResearch: () => void;
}

export function ResearchPanel({
  profile,
  sources,
  isResearching,
  error,
  onResearch,
}: ResearchPanelProps) {
  const aiClaims = profile?.claims.filter((claim) => claim.field.startsWith("ai.")) ?? [];

  return (
    <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Research Context</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Pull public source context for real-company mode. Generated operating data remains
            synthetic.
          </p>
          {error ? <p className="mt-1 text-sm text-red-700">{error}</p> : null}
        </div>
        <Button onClick={onResearch} disabled={isResearching}>
          {isResearching ? "Researching" : "Research Company"}
        </Button>
      </div>

      {profile ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-md border border-zinc-100 bg-zinc-50 p-3">
            <div className="text-xs font-medium uppercase text-zinc-500">Profile</div>
            <div className="mt-1 text-sm font-medium">{profile.companyName}</div>
            <div className="text-sm text-zinc-600">{profile.industry}</div>
            <div className="mt-2 text-xs text-zinc-500">{profile.claims.length} profile claims</div>
            {aiClaims.length ? (
              <div className="mt-3">
                <div className="text-xs font-medium uppercase text-zinc-500">AI Extracted</div>
                <ul className="mt-2 grid gap-1 text-sm text-zinc-700">
                  {aiClaims.slice(0, 8).map((claim) => (
                    <li key={claim.id}>{claim.value}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="mt-3 text-xs text-amber-700">
                No AI extraction claims were returned from the current sources.
              </div>
            )}
          </div>
          <div className="rounded-md border border-zinc-100 bg-zinc-50 p-3">
            <div className="text-xs font-medium uppercase text-zinc-500">Sources</div>
            <div className="mt-2 grid gap-2">
              {sources.map((source) => (
                <div key={source.id} className="text-sm">
                  <div className="font-medium text-zinc-800">{source.title}</div>
                  <div className="text-xs text-zinc-500">
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
