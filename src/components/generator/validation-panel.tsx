import type { GeneratedScenario } from "@/lib/domain/types";

export function ValidationPanel({ scenario }: { scenario: GeneratedScenario | null }) {
  if (!scenario) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-xs font-semibold uppercase text-slate-900">Validation</h2>
        <p className="mt-2 text-sm text-slate-500">Generate a scenario to run reconciliation checks.</p>
      </section>
    );
  }

  const errorCount = scenario.validations.filter((validation) => validation.severity === "error").length;
  const warningCount = scenario.validations.filter(
    (validation) => validation.severity === "warning",
  ).length;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase text-slate-900">Validation</h2>
          <p className="mt-1 text-sm text-slate-500">
            {errorCount === 0 && warningCount === 0
              ? "All generated tables passed reconciliation."
              : `${errorCount} errors · ${warningCount} warnings`}
          </p>
        </div>
        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
          {errorCount === 0 ? "Passed" : "Needs review"}
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        {scenario.validations.map((validation) => (
          <div
            key={`${validation.code}-${validation.message}`}
            className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
          >
            <div className="font-medium text-slate-800">
              {validation.severity.toUpperCase()} · {validation.code}
            </div>
            <div className="mt-1 text-slate-600">{validation.message}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
