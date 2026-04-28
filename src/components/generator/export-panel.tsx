"use client";

import { useMemo, useState } from "react";
import type { GeneratedScenario } from "@/lib/domain/types";
import {
  createTemplateFromHeaders,
  EXPORT_PROFILES,
  type ExportProfileId,
  type ExportTemplate,
  type TemplateSourceTable,
} from "@/lib/export/profiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function ExportPanel({ scenario }: { scenario: GeneratedScenario | null }) {
  const [status, setStatus] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<ExportProfileId>("standard");
  const [templateFileName, setTemplateFileName] = useState("template_import.csv");
  const [templateSourceTable, setTemplateSourceTable] =
    useState<TemplateSourceTable>("order_lines");
  const [templateHeaders, setTemplateHeaders] = useState(
    "Order Number,Order Date,Account Name,Sales Rep,SKU,Product Name,Quantity,Line Amount,Currency",
  );

  const selectedProfile =
    EXPORT_PROFILES.find((profile) => profile.id === profileId) ?? EXPORT_PROFILES[0];
  const parsedHeaders = useMemo(() => parseHeaderText(templateHeaders), [templateHeaders]);
  const template = useMemo(
    () =>
      createTemplateFromHeaders({
        fileName: templateFileName,
        sourceTable: templateSourceTable,
        headers: parsedHeaders,
      }),
    [parsedHeaders, templateFileName, templateSourceTable],
  );
  const templateCanExport = profileId !== "template" || template.columns.length > 0;

  async function exportScenario() {
    if (!scenario || !templateCanExport) {
      return;
    }

    setStatus("Preparing export");
    const templates: ExportTemplate[] = profileId === "template" ? [template] : [];
    const response = await fetch("/api/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scenario,
        profileId,
        templates,
      }),
    });

    if (!response.ok) {
      setStatus("Export failed");
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${scenario.metadata.scenarioId}-${profileId}.zip`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus(`${selectedProfile.label} ZIP ready`);
  }

  async function loadTemplateFile(file: File | undefined) {
    if (!file) {
      return;
    }

    const text = await file.text();
    const firstLine = text.split(/\r?\n/).find((line) => line.trim().length > 0) ?? "";
    setTemplateFileName(file.name);
    setTemplateHeaders(firstLine);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-xs font-semibold uppercase text-slate-900">Export</h2>
        <p className="mt-2 text-sm text-slate-600">
          Download canonical data or reshape it for BI, CRM, ERP finance, sales analysis, or a
          custom CSV template.
        </p>
        {scenario ? (
          <p className="mt-1 text-xs text-slate-500">
            Includes {Object.keys(scenario.tables).length} tables and{" "}
            {scenario.tables.orders.length.toLocaleString()} orders.
          </p>
        ) : null}
        {status ? <p className="mt-2 text-xs text-emerald-700">{status}</p> : null}
      </div>

      <div className="mt-4 grid gap-3">
        <label className="grid gap-1 text-xs font-medium text-slate-700">
          Export profile
          <Select
            value={profileId}
            onChange={(event) => setProfileId(event.target.value as ExportProfileId)}
          >
            {EXPORT_PROFILES.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.label}
              </option>
            ))}
          </Select>
        </label>
        <p className="text-xs text-slate-500">{selectedProfile.description}</p>
      </div>

      {profileId === "template" ? (
        <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px]">
            <label className="grid gap-1 text-xs font-medium text-slate-700">
              Output file
              <Input
                value={templateFileName}
                onChange={(event) => setTemplateFileName(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-700">
              Source rows
              <Select
                value={templateSourceTable}
                onChange={(event) =>
                  setTemplateSourceTable(event.target.value as TemplateSourceTable)
                }
              >
                <option value="order_lines">Order lines</option>
                <option value="orders">Orders</option>
                <option value="customers">Customers</option>
                <option value="products">Products</option>
                <option value="invoices">Invoices</option>
                <option value="payments">Payments</option>
                <option value="opportunities">Opportunities</option>
                <option value="returns">Returns</option>
                <option value="monthly_revenue">Monthly revenue</option>
              </Select>
            </label>
          </div>

          <label className="grid gap-1 text-xs font-medium text-slate-700">
            CSV headers
            <textarea
              className="min-h-24 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-500/15"
              value={templateHeaders}
              onChange={(event) => setTemplateHeaders(event.target.value)}
            />
          </label>

          <label className="grid gap-1 text-xs font-medium text-slate-700">
            Upload CSV template
            <Input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => void loadTemplateFile(event.target.files?.[0])}
            />
          </label>

          <TemplatePreview template={template} />
        </div>
      ) : null}

      <Button
        className="mt-4 w-full bg-teal-700 hover:bg-teal-800"
        disabled={!scenario || !templateCanExport}
        onClick={exportScenario}
      >
        Export ZIP
      </Button>
    </section>
  );
}

function TemplatePreview({ template }: { template: ExportTemplate }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase text-slate-700">Mapping Preview</h3>
        <span className="text-xs text-slate-500">{template.columns.length} columns</span>
      </div>
      <div className="mt-2 max-h-40 overflow-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="text-slate-500">
            <tr>
              <th className="py-1 pr-2">Column</th>
              <th className="py-1">Mapped value</th>
            </tr>
          </thead>
          <tbody>
            {template.columns.map((column) => (
              <tr key={column.header} className="border-t border-slate-200">
                <td className="py-1.5 pr-2 font-medium text-slate-800">{column.header}</td>
                <td className="py-1.5">
                  {column.source ?? (column.constant !== undefined ? String(column.constant) : "Unmapped")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function parseHeaderText(value: string) {
  const firstLine = value.split(/\r?\n/).find((line) => line.trim().length > 0) ?? "";

  return firstLine
    .split(",")
    .map((header) => header.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
}
