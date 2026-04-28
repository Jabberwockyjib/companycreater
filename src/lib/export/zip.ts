import JSZip from "jszip";
import type { GeneratedScenario } from "@/lib/domain/types";
import { scenarioToCsvFiles } from "./csv";
import { scenarioToJsonBundle } from "./json";
import { buildExportBundle, type ExportBundleOptions } from "./profiles";

export async function scenarioToZip(
  scenario: GeneratedScenario,
  options: ExportBundleOptions = {},
): Promise<ArrayBuffer> {
  const zip = new JSZip();
  const csvFiles = scenarioToCsvFiles(scenario);

  for (const [fileName, contents] of Object.entries(csvFiles)) {
    zip.file(`csv/${fileName}`, contents);
  }

  const bundle = scenarioToJsonBundle(scenario);
  zip.file("scenario.json", JSON.stringify(bundle, null, 2));
  zip.file("manifest.json", JSON.stringify(bundle.manifest, null, 2));
  zip.file("assumptions_report.txt", scenario.assumptionsReport.join("\n"));

  const exportBundle = buildExportBundle(scenario, options);
  if ((options.profileId ?? "standard") !== "standard") {
    for (const [fileName, contents] of Object.entries(exportBundle.files)) {
      zip.file(fileName, contents);
    }
  }
  zip.file("export_manifest.json", JSON.stringify(exportBundle.manifest, null, 2));
  zip.file("export_validation.json", JSON.stringify(exportBundle.validation, null, 2));

  return zip.generateAsync({ type: "arraybuffer" });
}
