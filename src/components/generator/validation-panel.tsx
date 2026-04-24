import type { GeneratedScenario } from "@/lib/domain/types";

export function ValidationPanel({ scenario }: { scenario: GeneratedScenario | null }) {
  if (!scenario) {
    return null;
  }

  return (
    <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold">Validation</h2>
      <div className="mt-3 grid gap-2">
        {scenario.validations.map((validation) => (
          <div
            key={`${validation.code}-${validation.message}`}
            className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm"
          >
            <div className="font-medium text-zinc-800">
              {validation.severity.toUpperCase()} · {validation.code}
            </div>
            <div className="mt-1 text-zinc-600">{validation.message}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
