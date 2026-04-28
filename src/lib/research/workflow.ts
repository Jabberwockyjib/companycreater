import type { CompanyProfile, ScenarioInput } from "@/lib/domain/types";

export function isResearchableCompanyInput(input: ScenarioInput): boolean {
  if (input.mode !== "real_company") {
    return false;
  }

  if (input.companyName.trim().length < 2) {
    return false;
  }

  if (!input.companyUrl) {
    return false;
  }

  try {
    const url = new URL(input.companyUrl);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function researchProfileMatchesInput(
  profile: CompanyProfile | null,
  input: ScenarioInput,
): profile is CompanyProfile {
  if (!profile) {
    return false;
  }

  return (
    normalize(profile.companyName) === normalize(input.companyName) &&
    profile.industry === input.industry &&
    profile.revenueTarget === input.revenueTarget &&
    sameValues(profile.regions, input.regions) &&
    sameValues(profile.channels, input.channels)
  );
}

export function researchRelevantInputChanged(
  previous: ScenarioInput,
  next: ScenarioInput,
): boolean {
  return (
    previous.mode !== next.mode ||
    normalize(previous.companyName) !== normalize(next.companyName) ||
    normalize(previous.companyUrl ?? "") !== normalize(next.companyUrl ?? "") ||
    previous.industry !== next.industry ||
    previous.revenueTarget !== next.revenueTarget ||
    !sameValues(previous.regions, next.regions) ||
    !sameValues(previous.channels, next.channels)
  );
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function sameValues(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
