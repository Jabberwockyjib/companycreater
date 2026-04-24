import JSZip from "jszip";
import type { GeneratedScenario } from "@/lib/domain/types";
import { scenarioToCsvFiles } from "./csv";
import { scenarioToJsonBundle } from "./json";

export async function scenarioToZip(scenario: GeneratedScenario): Promise<ArrayBuffer> {
  const zip = new JSZip();
  const csvFiles = scenarioToCsvFiles(scenario);

  for (const [fileName, contents] of Object.entries(csvFiles)) {
    zip.file(`csv/${fileName}`, contents);
  }

  zip.file("scenario.json", JSON.stringify(scenarioToJsonBundle(scenario), null, 2));
  zip.file("assumptions_report.txt", scenario.assumptionsReport.join("\n"));

  return zip.generateAsync({ type: "arraybuffer" });
}
