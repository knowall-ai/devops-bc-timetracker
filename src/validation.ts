import type { AppSettings, TimeEntryDraft, WorkItemContext } from "./types";

const MAX_DESCRIPTION_LENGTH = 250;

export function normalizeEnvironment(value: string): string {
  return value.trim() || "production";
}

export function validateSettings(settings: AppSettings): string[] {
  const errors: string[] = [];

  if (!settings.tenantId.trim()) {
    errors.push("Tenant ID is required.");
  }

  if (!settings.clientId.trim()) {
    errors.push("Entra App Client ID is required.");
  }

  if (!settings.companyId.trim()) {
    errors.push("Business Central company ID is required.");
  }

  if (!normalizeEnvironment(settings.environment)) {
    errors.push("Business Central environment is required.");
  }

  return errors;
}

export function validateTimeEntry(draft: TimeEntryDraft): string[] {
  const errors: string[] = [];

  if (!draft.date) {
    errors.push("Date is required.");
  }

  if (!Number.isFinite(draft.hours) || draft.hours <= 0 || draft.hours > 24) {
    errors.push("Hours must be greater than 0 and no more than 24.");
  }

  if (draft.description.length > 180) {
    errors.push("Description must be 180 characters or fewer.");
  }

  return errors;
}

export function buildBusinessCentralDescription(workItem: WorkItemContext, draft: TimeEntryDraft): string {
  const base = `ADO Work Item #${workItem.id}: ${workItem.type} - ${workItem.title}`;
  const suffix = draft.description.trim() ? ` | ${draft.description.trim()}` : "";
  return trimToLength(`${base}${suffix} | ${workItem.url}`, MAX_DESCRIPTION_LENGTH);
}

export function workItemMarker(workItemId: number): string {
  return `ADO Work Item #${workItemId}`;
}

export function formatHours(hours: number): string {
  return `${hours.toFixed(2)}h`;
}

export function formatDateForInput(date = new Date()): string {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
}

export function trimToLength(value: string, maxLength: number): string {
  const trimmed = value.trim();
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength - 3).trimEnd() + "..." : trimmed;
}
