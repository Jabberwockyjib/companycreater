import type { ScenarioInput } from "./types";

export const defaultScenarioInput: ScenarioInput = {
  mode: "fictional",
  seed: 42,
  companyName: "Acme Industrial Components",
  companyUrl: "",
  industry: "Industrial Components",
  revenueTarget: 75_000_000,
  startYear: 2023,
  years: 3,
  customerCount: 120,
  skuCount: 160,
  salesRepCount: 14,
  regions: ["Northeast", "Midwest", "Southeast", "West"],
  channels: ["direct", "distributor"],
  seasonality: "moderate",
  disruptionLevel: "moderate",
  trajectory: "stable",
  returnsRate: 0.035,
  rejectionRate: 0.012,
  churnRate: 0.08,
};

export const industryPresets = [
  "Industrial Components",
  "Packaging Materials",
  "Medical Devices",
  "Specialty Chemicals",
  "Foodservice Equipment",
] as const;
