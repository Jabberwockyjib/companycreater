"use client";

import type { ScenarioInput } from "@/lib/domain/types";
import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import { industryPresets } from "@/lib/domain/defaults";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatPercent } from "@/lib/format";

interface ScenarioFormProps {
  value: ScenarioInput;
  isGenerating: boolean;
  error: string | null;
  onChange: (value: ScenarioInput) => void;
  onGenerate: () => void;
}

export function ScenarioForm({
  value,
  isGenerating,
  error,
  onChange,
  onGenerate,
}: ScenarioFormProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase text-slate-900">Scenario Controls</h2>
          <span className="rounded-full bg-teal-50 px-2 py-1 text-[11px] font-medium text-teal-700">
            {value.mode === "real_company" ? "Real company" : "Fictional"}
          </span>
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Private operating data stays synthetic. Public context is labeled separately.
        </p>
      </div>
      <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 xl:grid-cols-1">
        <Field label="Mode">
          <Select
            value={value.mode}
            onChange={(event) =>
              onChange({ ...value, mode: event.target.value as ScenarioInput["mode"] })
            }
          >
            <option value="fictional">Fictional</option>
            <option value="real_company">Real-company inspired</option>
          </Select>
        </Field>
        <Field label="Company">
          <Input
            value={value.companyName}
            onChange={(event) => onChange({ ...value, companyName: event.target.value })}
          />
        </Field>
        <Field label="Company URL">
          <Input
            placeholder="https://example.com"
            value={value.companyUrl ?? ""}
            onChange={(event) => onChange({ ...value, companyUrl: event.target.value })}
          />
        </Field>
        <Field label="Industry">
          <Select
            value={value.industry}
            onChange={(event) => onChange({ ...value, industry: event.target.value })}
          >
            {industryPresets.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </Select>
        </Field>
        <NumberField
          label="Revenue Target"
          value={value.revenueTarget}
          onChange={(revenueTarget) => onChange({ ...value, revenueTarget })}
        />
        <NumberField
          label="Seed"
          value={value.seed}
          onChange={(seed) => onChange({ ...value, seed })}
        />
        <NumberField
          label="Start Year"
          value={value.startYear}
          onChange={(startYear) => onChange({ ...value, startYear })}
        />
        <NumberField
          label="Years"
          value={value.years}
          onChange={(years) => onChange({ ...value, years })}
        />
        <NumberField
          label="Customers"
          value={value.customerCount}
          onChange={(customerCount) => onChange({ ...value, customerCount })}
        />
        <NumberField
          label="SKUs"
          value={value.skuCount}
          onChange={(skuCount) => onChange({ ...value, skuCount })}
        />
        <NumberField
          label="Sales Reps"
          value={value.salesRepCount}
          onChange={(salesRepCount) => onChange({ ...value, salesRepCount })}
        />
        <Field label="Seasonality">
          <Select
            value={value.seasonality}
            onChange={(event) =>
              onChange({ ...value, seasonality: event.target.value as ScenarioInput["seasonality"] })
            }
          >
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
          </Select>
        </Field>
        <Field label="Supply Disruption">
          <Select
            value={value.disruptionLevel}
            onChange={(event) =>
              onChange({
                ...value,
                disruptionLevel: event.target.value as ScenarioInput["disruptionLevel"],
              })
            }
          >
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
          </Select>
        </Field>
        <Field label="Trajectory">
          <Select
            value={value.trajectory ?? "stable"}
            onChange={(event) =>
              onChange({
                ...value,
                trajectory: event.target.value as NonNullable<ScenarioInput["trajectory"]>,
              })
            }
          >
            <option value="stable">Stable</option>
            <option value="growth">Growing</option>
            <option value="decline">Declining</option>
            <option value="turnaround">Turnaround</option>
            <option value="supply_constrained">Supply constrained</option>
            <option value="breakout">Skyrocketing</option>
          </Select>
        </Field>
        <RateField
          label={`Returns ${formatPercent(value.returnsRate)}`}
          value={value.returnsRate}
          max={0.2}
          onChange={(returnsRate) => onChange({ ...value, returnsRate })}
        />
        <RateField
          label={`Rejections ${formatPercent(value.rejectionRate)}`}
          value={value.rejectionRate}
          max={0.1}
          onChange={(rejectionRate) => onChange({ ...value, rejectionRate })}
        />
        <RateField
          label={`Churn ${formatPercent(value.churnRate)}`}
          value={value.churnRate}
          max={0.3}
          onChange={(churnRate) => onChange({ ...value, churnRate })}
        />
        <Field label="Regions">
          <Input
            value={value.regions.join(", ")}
            onChange={(event) =>
              onChange({
                ...value,
                regions: event.target.value
                  .split(",")
                  .map((region) => region.trim())
                  .filter(Boolean),
              })
            }
          />
        </Field>
        <Field label="Channels">
          <Input
            value={value.channels.join(", ")}
            onChange={(event) =>
              onChange({
                ...value,
                channels: event.target.value
                  .split(",")
                  .map((channel) => channel.trim())
                  .filter((channel): channel is ScenarioInput["channels"][number] =>
                    ["direct", "distributor", "partner", "ecommerce"].includes(channel),
                  ),
              })
            }
          />
        </Field>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4">
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <Button className="w-full bg-teal-700 hover:bg-teal-800" onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? "Generating" : "Generate Scenario"}
        </Button>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const generatedId = useId();
  const control =
    isValidElement<{ id?: string }>(children) && !children.props.id
      ? cloneElement(children as ReactElement<{ id?: string }>, { id: generatedId })
      : children;
  const controlId = isValidElement<{ id?: string }>(control) ? control.props.id : generatedId;

  return (
    <div className="grid gap-1 text-sm">
      <label htmlFor={controlId} className="text-xs font-medium text-slate-600">
        {label}
      </label>
      {control}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <Input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </Field>
  );
}

function RateField({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <Input
        type="range"
        min={0}
        max={max}
        step={0.005}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </Field>
  );
}
