import type { z } from "zod";

export function validationDetails(error: z.ZodError): string[] {
  const details = new Set<string>();

  for (const issue of error.issues) {
    if (issue.code === "invalid_union") {
      for (const nestedError of issue.errors) {
        for (const nestedIssue of nestedError) {
          details.add(nestedIssue.message);
        }
      }
      continue;
    }

    details.add(issue.message);
  }

  return [...details].filter((message) => message !== "Invalid input");
}
