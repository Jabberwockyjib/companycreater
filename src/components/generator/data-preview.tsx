"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import type { GeneratedScenario } from "@/lib/domain/types";
import { formatCurrency } from "@/lib/format";

export function DataPreview({ scenario }: { scenario: GeneratedScenario | null }) {
  const [activeTable, setActiveTable] = useState("Customers");

  if (!scenario) {
    return null;
  }

  const tables = [
    {
      title: "Customers",
      headers: ["Name", "Segment", "Region", "Potential"],
      rows: scenario.tables.customers.slice(0, 8).map((customer) => (
        <tr key={customer.id} className="border-t border-slate-100">
          <td className="py-2.5 pr-4 font-medium text-slate-800">{customer.name}</td>
          <td className="py-2.5 pr-4">{customer.segment}</td>
          <td className="py-2.5 pr-4">{customer.region}</td>
          <td className="py-2.5 pr-4">{formatCurrency(customer.annualPotential)}</td>
        </tr>
      )),
    },
    {
      title: "Orders",
      headers: ["Order", "Date", "Status", "Total"],
      rows: scenario.tables.orders.slice(0, 8).map((order) => (
        <tr key={order.id} className="border-t border-slate-100">
          <td className="py-2.5 pr-4 font-medium text-slate-800">{order.id}</td>
          <td className="py-2.5 pr-4">{order.orderDate}</td>
          <td className="py-2.5 pr-4">{order.status}</td>
          <td className="py-2.5 pr-4">{formatCurrency(order.total)}</td>
        </tr>
      )),
    },
    {
      title: "Returns",
      headers: ["Return", "Reason", "Date", "Credit"],
      rows: scenario.tables.returns.slice(0, 8).map((record) => (
        <tr key={record.id} className="border-t border-slate-100">
          <td className="py-2.5 pr-4 font-medium text-slate-800">{record.id}</td>
          <td className="py-2.5 pr-4">{record.reason}</td>
          <td className="py-2.5 pr-4">{record.returnDate}</td>
          <td className="py-2.5 pr-4">{formatCurrency(record.creditAmount)}</td>
        </tr>
      )),
    },
    {
      title: "Products",
      headers: ["SKU", "Name", "Lifecycle", "Price"],
      rows: scenario.tables.skus.slice(0, 8).map((sku) => (
        <tr key={sku.id} className="border-t border-slate-100">
          <td className="py-2.5 pr-4 font-medium text-slate-800">{sku.skuCode}</td>
          <td className="py-2.5 pr-4">{sku.name}</td>
          <td className="py-2.5 pr-4">{sku.lifecycleStatus}</td>
          <td className="py-2.5 pr-4">{formatCurrency(sku.unitPrice)}</td>
        </tr>
      )),
    },
  ];
  const selectedTable = tables.find((table) => table.title === activeTable) ?? tables[0];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase text-slate-900">Data Preview</h2>
          <p className="mt-1 text-xs text-slate-500">
            Sample rows from generated CRM, order, return, and product tables.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-md bg-slate-100 p-1">
          {tables.map((table) => (
            <button
              key={table.title}
              className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                activeTable === table.title
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-600 hover:text-slate-950"
              }`}
              onClick={() => setActiveTable(table.title)}
            >
              {table.title}
            </button>
          ))}
        </div>
      </div>
      <PreviewBlock title={selectedTable.title} headers={selectedTable.headers}>
        {selectedTable.rows}
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
    <div className="mt-3">
      <h3 className="sr-only">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm text-slate-600">
          <thead className="text-xs uppercase text-slate-500">
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
