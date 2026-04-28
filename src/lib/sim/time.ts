import type { ScenarioInput } from "@/lib/domain/types";

export interface ScenarioHorizon {
  startDate: string;
  asOfDate: string;
  startYear: number;
  years: number;
  totalMonths: number;
  revenueYears: number;
}

export function normalizeScenarioInputDates(input: ScenarioInput): ScenarioInput {
  const horizon = getScenarioHorizon(input);

  return {
    ...input,
    startYear: horizon.startYear,
    years: horizon.years,
    historyYears: input.historyYears,
    asOfDate: horizon.asOfDate,
  };
}

export function getScenarioHorizon(input: ScenarioInput): ScenarioHorizon {
  if (input.asOfDate && input.historyYears) {
    const asOf = parseDate(input.asOfDate);
    const start = new Date(asOf);
    start.setUTCFullYear(start.getUTCFullYear() - input.historyYears);
    const startDate = toDateString(start);
    const totalMonths = monthDistance(startDate, input.asOfDate) + 1;

    return {
      startDate,
      asOfDate: input.asOfDate,
      startYear: Number(startDate.slice(0, 4)),
      years: Math.max(1, Math.ceil(totalMonths / 12)),
      totalMonths,
      revenueYears: totalMonths / 12,
    };
  }

  const startDate = `${input.startYear}-01-01`;
  const asOfDate = `${input.startYear + input.years - 1}-12-28`;

  return {
    startDate,
    asOfDate,
    startYear: input.startYear,
    years: input.years,
    totalMonths: input.years * 12,
    revenueYears: input.years,
  };
}

export function monthAtOffset(input: ScenarioInput, monthOffset: number): {
  year: number;
  month: number;
  monthKey: string;
} {
  const horizon = getScenarioHorizon(input);
  const startYear = Number(horizon.startDate.slice(0, 4));
  const startMonth = Number(horizon.startDate.slice(5, 7));
  const zeroBasedStartMonth = startMonth - 1;
  const absoluteMonth = zeroBasedStartMonth + monthOffset;
  const year = startYear + Math.floor(absoluteMonth / 12);
  const month = (absoluteMonth % 12) + 1;
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  return { year, month, monthKey };
}

export function clampDate(dateString: string, maxDateString: string): string {
  return dateString > maxDateString ? maxDateString : dateString;
}

export function monthDistance(startDate: string, endDate: string): number {
  const startYear = Number(startDate.slice(0, 4));
  const startMonth = Number(startDate.slice(5, 7));
  const endYear = Number(endDate.slice(0, 4));
  const endMonth = Number(endDate.slice(5, 7));

  return (endYear - startYear) * 12 + endMonth - startMonth;
}

export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDate(dateString: string): Date {
  return new Date(`${dateString}T00:00:00.000Z`);
}
