import { describe, expect, it } from "vitest";
import { defaultScenarioInput } from "@/lib/domain/defaults";
import type { CompanyProfile } from "@/lib/domain/types";
import {
  isResearchableCompanyInput,
  researchProfileMatchesInput,
  researchRelevantInputChanged,
} from "@/lib/research/workflow";

const profile: CompanyProfile = {
  companyName: defaultScenarioInput.companyName,
  industry: defaultScenarioInput.industry,
  revenueTarget: defaultScenarioInput.revenueTarget,
  regions: defaultScenarioInput.regions,
  channels: defaultScenarioInput.channels,
  claims: [],
};

describe("research workflow", () => {
  it("requires real-company mode with a viable company name and website", () => {
    expect(
      isResearchableCompanyInput({
        ...defaultScenarioInput,
        mode: "real_company",
        companyName: "Cleveland Gear",
        companyUrl: "https://www.clevelandgear.com",
      }),
    ).toBe(true);

    expect(
      isResearchableCompanyInput({
        ...defaultScenarioInput,
        mode: "fictional",
        companyName: "Cleveland Gear",
        companyUrl: "https://www.clevelandgear.com",
      }),
    ).toBe(false);
    expect(
      isResearchableCompanyInput({
        ...defaultScenarioInput,
        mode: "real_company",
        companyName: "A",
        companyUrl: "https://www.clevelandgear.com",
      }),
    ).toBe(false);
    expect(
      isResearchableCompanyInput({
        ...defaultScenarioInput,
        mode: "real_company",
        companyName: "Cleveland Gear",
        companyUrl: "not a website",
      }),
    ).toBe(false);
  });

  it("detects when a research profile still matches the active input", () => {
    expect(researchProfileMatchesInput(profile, defaultScenarioInput)).toBe(true);
    expect(
      researchProfileMatchesInput(profile, {
        ...defaultScenarioInput,
        companyName: "Different Company",
      }),
    ).toBe(false);
    expect(
      researchProfileMatchesInput(profile, {
        ...defaultScenarioInput,
        channels: ["partner"],
      }),
    ).toBe(false);
  });

  it("detects changes that should clear current research", () => {
    expect(
      researchRelevantInputChanged(defaultScenarioInput, {
        ...defaultScenarioInput,
        companyUrl: "https://www.clevelandgear.com",
      }),
    ).toBe(true);
    expect(
      researchRelevantInputChanged(defaultScenarioInput, {
        ...defaultScenarioInput,
        customerCount: defaultScenarioInput.customerCount + 1,
      }),
    ).toBe(false);
  });
});
