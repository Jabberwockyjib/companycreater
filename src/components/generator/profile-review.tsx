import type { GeneratedScenario } from "@/lib/domain/types";

export function ProfileReview({ scenario }: { scenario: GeneratedScenario | null }) {
  if (!scenario) {
    return null;
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase text-slate-900">Profile Claims</h2>
        <span className="text-xs text-slate-500">{scenario.profile.claims.length} claims</span>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2 pr-4">Field</th>
              <th className="py-2 pr-4">Value</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {scenario.profile.claims.map((claim) => (
              <tr key={claim.id} className="border-t border-slate-100">
                <td className="py-2 pr-4 font-medium text-slate-800">{claim.field}</td>
                <td className="py-2 pr-4 text-slate-700">{claim.value}</td>
                <td className="py-2 pr-4 text-slate-700">{claim.sourceType}</td>
                <td className="py-2 pr-4 text-slate-700">
                  {Math.round(claim.confidence * 100)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
