import type {
  AppSettings,
  BusinessCentralCollection,
  BusinessCentralTimeEntry,
  TimeEntryDraft,
  WorkItemContext
} from "./types";
import { buildBusinessCentralDescription, normalizeEnvironment, workItemMarker } from "./validation";

interface BusinessCentralEmployee {
  id: string;
  number?: string;
  displayName?: string;
  email?: string;
}

function companyBaseUrl(settings: AppSettings): string {
  const environment = encodeURIComponent(normalizeEnvironment(settings.environment));
  const tenantId = encodeURIComponent(settings.tenantId.trim());
  const companyId = encodeURIComponent(settings.companyId.trim());
  return `https://api.businesscentral.dynamics.com/v2.0/${tenantId}/${environment}/api/v2.0/companies(${companyId})`;
}

function queryString(values: Record<string, string>): string {
  return new URLSearchParams(values).toString();
}

async function bcFetch<T>(settings: AppSettings, accessToken: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${companyBaseUrl(settings)}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    let detail = "";
    try {
      const payload = (await response.json()) as { error?: { message?: string }; message?: string };
      detail = payload.error?.message ?? payload.message ?? "";
    } catch {
      detail = await response.text();
    }
    throw new Error(`Business Central request failed (${response.status}): ${detail || response.statusText}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function createTimeEntry(
  settings: AppSettings,
  accessToken: string,
  workItem: WorkItemContext,
  draft: TimeEntryDraft
): Promise<BusinessCentralTimeEntry> {
  const employeeId = await resolveEmployeeId(settings, accessToken, workItem.userEmail);
  const description = buildBusinessCentralDescription(workItem, draft);
  const body: Record<string, unknown> = {
    employeeId,
    date: draft.date,
    quantity: draft.hours,
    unitOfMeasureCode: "HOUR",
    description
  };

  const jobNumber = draft.jobNumber?.trim() || settings.defaultJobNumber?.trim();
  if (jobNumber) {
    body.jobNumber = jobNumber;
  }

  return bcFetch<BusinessCentralTimeEntry>(settings, accessToken, "/timeRegistrationEntries", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function listTimeEntriesForWorkItem(
  settings: AppSettings,
  accessToken: string,
  workItemId: number
): Promise<BusinessCentralTimeEntry[]> {
  const marker = workItemMarker(workItemId);
  const payload = await bcFetch<BusinessCentralCollection<BusinessCentralTimeEntry>>(
    settings,
    accessToken,
    `/timeRegistrationEntries?${queryString({ "$top": "100", "$orderby": "date desc" })}`
  );

  return payload.value.filter((entry) => entry.description?.includes(marker));
}

async function resolveEmployeeId(settings: AppSettings, accessToken: string, userEmail?: string): Promise<string> {
  if (settings.employeeId?.trim()) {
    return settings.employeeId.trim();
  }

  if (!userEmail) {
    throw new Error("Set an Employee ID because the current Azure DevOps user email is unavailable.");
  }

  const escapedEmail = userEmail.replace(/'/g, "''");
  const payload = await bcFetch<BusinessCentralCollection<BusinessCentralEmployee>>(
    settings,
    accessToken,
    `/employees?${queryString({ "$filter": `email eq '${escapedEmail}'`, "$top": "1" })}`
  );

  const employee = payload.value[0];
  if (!employee?.id) {
    throw new Error(`No Business Central employee was found for ${userEmail}. Set Employee ID manually.`);
  }

  return employee.id;
}
