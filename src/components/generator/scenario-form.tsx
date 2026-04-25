"use client";

import type { ScenarioInput } from "@/lib/domain/types";
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
    <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-1 border-b border-zinc-100 pb-3">
        <h2 className="text-sm font-semibold">Scenario Controls</h2>
        <p className="text-sm text-zinc-600">
          Private operating data is synthetic. Public company context remains labeled separately.
        </p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-4">
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
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-100 pt-4">
        <p className="text-sm text-red-700">{error}</p>
        <Button onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? "Generating" : "Generate Scenario"}
        </Button>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      {children}
    </label>
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
