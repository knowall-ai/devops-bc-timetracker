import { describe, expect, it } from "vitest";
import {
  buildBusinessCentralDescription,
  formatDateForInput,
  normalizeEnvironment,
  validateSettings,
  validateTimeEntry,
  workItemMarker
} from "./validation";

describe("validation helpers", () => {
  it("normalizes blank environments to production", () => {
    expect(normalizeEnvironment("")).toBe("production");
    expect(normalizeEnvironment(" sandbox ")).toBe("sandbox");
  });

  it("requires core Business Central settings", () => {
    expect(
      validateSettings({
        tenantId: "",
        clientId: "",
        environment: "production",
        companyId: ""
      })
    ).toHaveLength(3);
  });

  it("accepts a valid time entry", () => {
    expect(validateTimeEntry({ date: "2026-05-11", hours: 1.5, description: "Build widget" })).toEqual([]);
  });

  it("rejects impossible time values", () => {
    expect(validateTimeEntry({ date: "2026-05-11", hours: 0, description: "" })).toContain(
      "Hours must be greater than 0 and no more than 24."
    );
    expect(validateTimeEntry({ date: "2026-05-11", hours: 25, description: "" })).toContain(
      "Hours must be greater than 0 and no more than 24."
    );
  });

  it("builds bounded descriptions with a stable work item marker", () => {
    const description = buildBusinessCentralDescription(
      {
        id: 123,
        title: "A very long title ".repeat(30),
        type: "Bug",
        url: "https://dev.azure.com/example/project/_workitems/edit/123"
      },
      {
        date: "2026-05-11",
        hours: 2,
        description: "diagnosed and fixed",
        jobNumber: "P-001"
      }
    );

    expect(description).toContain(workItemMarker(123));
    expect(description.length).toBeLessThanOrEqual(250);
  });

  it("formats local dates for date inputs", () => {
    expect(formatDateForInput(new Date("2026-05-11T12:00:00Z"))).toMatch(/^2026-05-/);
  });
});
