import type { GeneratedScenario } from "@/lib/domain/types";

export function ProfileReview({ scenario }: { scenario: GeneratedScenario | null }) {
  if (!scenario) {
    return null;
  }

  return (
    <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Profile Claims</h2>
        <span className="text-xs text-zinc-500">{scenario.profile.claims.length} claims</span>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase text-zinc-500">
            <tr>
              <th className="py-2 pr-4">Field</th>
              <th className="py-2 pr-4">Value</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {scenario.profile.claims.map((claim) => (
              <tr key={claim.id} className="border-t border-zinc-100">
                <td className="py-2 pr-4 font-medium text-zinc-800">{claim.field}</td>
                <td className="py-2 pr-4 text-zinc-700">{claim.value}</td>
                <td className="py-2 pr-4 text-zinc-700">{claim.sourceType}</td>
                <td className="py-2 pr-4 text-zinc-700">
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
