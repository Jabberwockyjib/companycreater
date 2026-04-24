import type { ReactNode } from "react";
import type { GeneratedScenario } from "@/lib/domain/types";
import { formatCurrency } from "@/lib/format";

export function DataPreview({ scenario }: { scenario: GeneratedScenario | null }) {
  if (!scenario) {
    return null;
  }

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <PreviewBlock
        title="Customers"
        headers={["Name", "Segment", "Region", "Potential"]}
      >
        {scenario.tables.customers.slice(0, 6).map((customer) => (
          <tr key={customer.id} className="border-t border-zinc-100">
            <td className="py-2 pr-4">{customer.name}</td>
            <td className="py-2 pr-4">{customer.segment}</td>
            <td className="py-2 pr-4">{customer.region}</td>
            <td className="py-2 pr-4">{formatCurrency(customer.annualPotential)}</td>
          </tr>
        ))}
      </PreviewBlock>
      <PreviewBlock title="Orders" headers={["Order", "Date", "Status", "Total"]}>
        {scenario.tables.orders.slice(0, 6).map((order) => (
          <tr key={order.id} className="border-t border-zinc-100">
            <td className="py-2 pr-4">{order.id}</td>
            <td className="py-2 pr-4">{order.orderDate}</td>
            <td className="py-2 pr-4">{order.status}</td>
            <td className="py-2 pr-4">{formatCurrency(order.total)}</td>
          </tr>
        ))}
      </PreviewBlock>
      <PreviewBlock title="Returns" headers={["Return", "Reason", "Date", "Credit"]}>
        {scenario.tables.returns.slice(0, 6).map((record) => (
          <tr key={record.id} className="border-t border-zinc-100">
            <td className="py-2 pr-4">{record.id}</td>
            <td className="py-2 pr-4">{record.reason}</td>
            <td className="py-2 pr-4">{record.returnDate}</td>
            <td className="py-2 pr-4">{formatCurrency(record.creditAmount)}</td>
          </tr>
        ))}
      </PreviewBlock>
      <PreviewBlock title="Rejections" headers={["Rejection", "Reason", "Date", "Amount"]}>
        {scenario.tables.rejections.slice(0, 6).map((record) => (
          <tr key={record.id} className="border-t border-zinc-100">
            <td className="py-2 pr-4">{record.id}</td>
            <td className="py-2 pr-4">{record.reason}</td>
            <td className="py-2 pr-4">{record.rejectionDate}</td>
            <td className="py-2 pr-4">{formatCurrency(record.rejectedAmount)}</td>
          </tr>
        ))}
      </PreviewBlock>
    </section>
  );
}

function PreviewBlock({
  title,
  headers,
  children,
}: {
  title: string;
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="text-xs uppercase text-zinc-500">
            <tr>
              {headers.map((header) => (
                <th key={header} className="py-2 pr-4">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}
