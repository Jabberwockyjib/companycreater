import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScenarioForm } from "@/components/generator/scenario-form";
import { defaultScenarioInput } from "@/lib/domain/defaults";

describe("ScenarioForm", () => {
  it("uses a research-first generate action for viable real-company inputs", () => {
    render(
      <ScenarioForm
        value={{
          ...defaultScenarioInput,
          mode: "real_company",
          companyName: "Cleveland Gear",
          companyUrl: "https://www.clevelandgear.com",
        }}
        isGenerating={false}
        error={null}
        onChange={vi.fn()}
        onGenerate={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Research & Generate" })).toBeTruthy();
  });

  it("keeps direct generation for fictional scenarios", () => {
    render(
      <ScenarioForm
        value={defaultScenarioInput}
        isGenerating={false}
        error={null}
        onChange={vi.fn()}
        onGenerate={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Generate Scenario" })).toBeTruthy();
  });

  it("disables real-company generation until a viable website is present", () => {
    render(
      <ScenarioForm
        value={{
          ...defaultScenarioInput,
          mode: "real_company",
          companyName: "Cleveland Gear",
          companyUrl: "",
        }}
        isGenerating={false}
        error={null}
        onChange={vi.fn()}
        onGenerate={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Add Company Website" }).hasAttribute("disabled")).toBe(true);
  });
});
