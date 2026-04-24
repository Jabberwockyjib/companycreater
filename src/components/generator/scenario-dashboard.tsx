import type { GeneratedScenario } from "@/lib/domain/types";
import { formatCurrency } from "@/lib/format";

export function ScenarioDashboard({ scenario }: { scenario: GeneratedScenario | null }) {
  if (!scenario) {
    return (
      <section className="rounded-md border border-zinc-200 bg-white p-4 text-sm text-zinc-600 shadow-sm">
        Generate a scenario to preview revenue, customers, orders, and supply effects.
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

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <Metric label="Booked Revenue" value={formatCurrency(bookedRevenue)} />
      <Metric label="Credits" value={formatCurrency(creditedRevenue)} />
      <Metric label="Customers" value={scenario.tables.customers.length.toLocaleString()} />
      <Metric label="Orders" value={scenario.tables.orders.length.toLocaleString()} />
      <Metric label="Supply Events" value={scenario.tables.supplyEvents.length.toLocaleString()} />
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase text-zinc-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
