import type { GeneratedScenario } from "@/lib/domain/types";
import { formatCurrency } from "@/lib/format";

export function ScenarioDashboard({ scenario }: { scenario: GeneratedScenario | null }) {
  if (!scenario) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex min-h-[240px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center">
          <div className="text-sm font-medium text-slate-900">No scenario generated</div>
          <p className="mt-1 max-w-md text-sm text-slate-500">
            Generate a scenario to preview revenue, customers, orders, returns, and supply effects.
          </p>
        </div>
      </section>
    );
  }

  const bookedRevenue = scenario.tables.monthlyRevenue.reduce(
    (sum, item) => sum + item.bookedRevenue,
    0,
  );
  const creditedRevenue = scenario.tables.monthlyRevenue.reduce(
    (sum, item) => sum + item.creditedRevenue,
    0,
  );
  const collectedRevenue = scenario.tables.monthlyRevenue.reduce(
    (sum, item) => sum + item.collectedRevenue,
    0,
  );
  const endingArBalance =
    scenario.tables.monthlyRevenue[scenario.tables.monthlyRevenue.length - 1]?.endingArBalance ?? 0;

  const averageOrderValue =
    scenario.tables.orders.length > 0 ? bookedRevenue / scenario.tables.orders.length : 0;
  const shippedUnits = scenario.tables.inventoryPositions.reduce(
    (sum, item) => sum + item.shippedQuantity,
    0,
  );
  const backorderedUnits = scenario.tables.inventoryPositions.reduce(
    (sum, item) => sum + item.backorderedQuantity,
    0,
  );
  const fillRate =
    shippedUnits + backorderedUnits > 0
      ? (shippedUnits / (shippedUnits + backorderedUnits)) * 100
      : 100;
  const maxMonthlyRevenue = Math.max(
    ...scenario.tables.monthlyRevenue.map((month) => month.bookedRevenue),
    1,
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-100 pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold uppercase text-slate-900">Scenario Overview</h2>
            <span className="rounded-full bg-teal-50 px-2 py-1 text-[11px] font-medium text-teal-700">
              {scenario.profile.claims.some((claim) => claim.field.startsWith("ai."))
                ? "AI Extracted"
                : "Synthetic"}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {scenario.profile.companyName} · {scenario.profile.industry}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          <span>Seed {scenario.metadata.seed}</span>
          <span>{scenario.profile.regions.join(", ")}</span>
          <span>{scenario.profile.channels.join(", ")}</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Revenue" value={formatCurrency(bookedRevenue)} trend="Booked total" />
        <Metric label="Customers" value={scenario.tables.customers.length.toLocaleString()} trend="Accounts" />
        <Metric label="Orders" value={scenario.tables.orders.length.toLocaleString()} trend="Sales cycle" />
        <Metric label="Avg Order" value={formatCurrency(averageOrderValue)} trend="AOV" />
        <Metric label="SKUs" value={scenario.tables.skus.length.toLocaleString()} trend="Catalog" />
        <Metric label="Credits" value={formatCurrency(creditedRevenue)} trend="Returns/rejects" tone="amber" />
        <Metric label="Fill Rate" value={`${fillRate.toFixed(1)}%`} trend="Shipped units" tone="teal" />
        <Metric
          label="Backorders"
          value={backorderedUnits.toLocaleString()}
          trend="Unfilled units"
          tone={backorderedUnits > 0 ? "amber" : "teal"}
        />
        <Metric label="Collected" value={formatCurrency(collectedRevenue)} trend="Cash receipts" tone="teal" />
        <Metric label="Open AR" value={formatCurrency(endingArBalance)} trend="Ending balance" tone="amber" />
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase text-slate-500">Monthly Revenue Shape</h3>
          <span className="text-xs text-slate-500">
            {scenario.tables.monthlyRevenue.length} periods
          </span>
        </div>
        <div className="mt-3 flex h-24 items-end gap-1">
          {scenario.tables.monthlyRevenue.slice(-24).map((month) => (
            <div
              key={month.month}
              className="flex flex-1 items-end rounded-t-sm bg-teal-600/80"
              style={{ height: `${Math.max(10, (month.bookedRevenue / maxMonthlyRevenue) * 100)}%` }}
              title={`${month.month}: ${formatCurrency(month.bookedRevenue)}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  trend,
  tone = "default",
}: {
  label: string;
  value: string;
  trend: string;
  tone?: "default" | "amber" | "teal";
}) {
  const trendColor =
    tone === "amber"
      ? "mt-1 text-xs text-amber-700"
      : tone === "teal"
        ? "mt-1 text-xs text-teal-700"
        : "mt-1 text-xs text-emerald-700";

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-950">{value}</div>
      <div className={trendColor}>{trend}</div>
    </div>
  );
}
