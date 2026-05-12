import { beginMicrosoftSignIn, completeMicrosoftSignIn, getValidAccessToken, hasAuthCallback, isTokenUsable } from "./auth";
import { getWorkItemContext, initializeAzureDevOps, notifyLoadFailed, notifyLoaded, resizeExtension } from "./azure-devops";
import { createTimeEntry, listTimeEntriesForWorkItem } from "./business-central";
import { clearAuthToken, getAuthToken, getSettings, saveEntryReference, saveSettings } from "./storage";
import type { AppSettings, BusinessCentralTimeEntry, TimeEntryDraft, WorkItemContext } from "./types";
import {
  formatDateForInput,
  formatHours,
  normalizeEnvironment,
  validateSettings,
  validateTimeEntry
} from "./validation";

let workItem: WorkItemContext = {
  id: 0,
  title: "Loading",
  type: "Work Item",
  url: window.location.href
};

const elements = {
  workItemSummary: byId("work-item-summary"),
  connectionBadge: byId("connection-badge"),
  settingsPanel: byId("settings-panel"),
  authCallbackPanel: byId("auth-callback-panel"),
  settingsForm: byId<HTMLFormElement>("settings-form"),
  toggleSettings: byId<HTMLButtonElement>("toggle-settings"),
  showSettings: byId<HTMLButtonElement>("show-settings"),
  connectButton: byId<HTMLButtonElement>("connect-bc"),
  entryDate: byId<HTMLInputElement>("entry-date"),
  entryHours: byId<HTMLInputElement>("entry-hours"),
  entryDescription: byId<HTMLTextAreaElement>("entry-description"),
  entryJobNumber: byId<HTMLInputElement>("entry-job-number"),
  timeEntryForm: byId<HTMLFormElement>("time-entry-form"),
  submitEntry: byId<HTMLButtonElement>("submit-entry"),
  refreshHistory: byId<HTMLButtonElement>("refresh-history"),
  totalHours: byId("total-hours"),
  entryList: byId("entry-list"),
  statusLine: byId("status-line")
};

void boot();

async function boot(): Promise<void> {
  wireEvents();
  elements.entryDate.value = formatDateForInput();
  hydrateSettingsForm(getSettings());
  updateConnectionBadge();

  try {
    await initializeAzureDevOps();
    workItem = await getWorkItemContext();
    renderWorkItem();

    if (hasAuthCallback()) {
      await finishAuthCallback();
    }

    await loadHistoryIfConnected();
    await notifyLoaded();
    resizeExtension(document.body.scrollHeight + 16);
  } catch (error) {
    const typedError = error instanceof Error ? error : new Error(String(error));
    setStatus(typedError.message, "error");
    await notifyLoadFailed(typedError);
  }
}

function wireEvents(): void {
  elements.settingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const settings = readSettingsForm();
    const errors = validateSettings(settings);
    if (errors.length > 0) {
      setStatus(errors.join(" "), "error");
      return;
    }
    saveSettings(settings);
    elements.entryJobNumber.value = settings.defaultJobNumber ?? "";
    setStatus("Settings saved.", "success");
  });

  elements.connectButton.addEventListener("click", async () => {
    try {
      const settings = ensureSavedSettings();
      await beginMicrosoftSignIn(settings);
    } catch (error) {
      setStatus(errorMessage(error), "error");
    }
  });

  elements.timeEntryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await submitTimeEntry();
  });

  elements.refreshHistory.addEventListener("click", async () => {
    await loadHistoryIfConnected(true);
  });

  elements.toggleSettings.addEventListener("click", () => {
    elements.settingsPanel.classList.add("collapsed");
  });

  elements.showSettings.addEventListener("click", () => {
    elements.settingsPanel.classList.remove("collapsed");
    resizeExtension(document.body.scrollHeight + 16);
  });
}

async function finishAuthCallback(): Promise<void> {
  const settings = ensureSavedSettings();
  elements.authCallbackPanel.classList.remove("hidden");
  await completeMicrosoftSignIn(settings);
  elements.authCallbackPanel.classList.add("hidden");
  updateConnectionBadge();
  setStatus("Connected to Business Central.", "success");
}

async function submitTimeEntry(): Promise<void> {
  const settings = ensureSavedSettings();
  const draft: TimeEntryDraft = {
    date: elements.entryDate.value,
    hours: Number(elements.entryHours.value),
    description: elements.entryDescription.value
  };
  const jobNumber = elements.entryJobNumber.value.trim();
  if (jobNumber) {
    draft.jobNumber = jobNumber;
  }
  const errors = validateTimeEntry(draft);
  if (errors.length > 0) {
    setStatus(errors.join(" "), "error");
    return;
  }

  setBusy(true);
  try {
    const accessToken = await getValidAccessToken(settings);
    const entry = await createTimeEntry(settings, accessToken, workItem, draft);
    saveEntryReference({
      workItemId: workItem.id,
      businessCentralEntryId: entry.id,
      createdAt: new Date().toISOString()
    });
    elements.entryDescription.value = "";
    await loadHistoryIfConnected(true);
    setStatus("Time entry logged to Business Central.", "success");
  } catch (error) {
    setStatus(errorMessage(error), "error");
  } finally {
    setBusy(false);
  }
}

async function loadHistoryIfConnected(force = false): Promise<void> {
  const settings = getSettings();
  const token = getAuthToken();

  updateConnectionBadge();
  if (!settings || !token || !isTokenUsable(token)) {
    if (force) {
      setStatus("Connect to Business Central to load history.", "error");
    }
    renderEntries([]);
    return;
  }

  setBusy(true);
  try {
    const accessToken = await getValidAccessToken(settings);
    const entries = await listTimeEntriesForWorkItem(settings, accessToken, workItem.id);
    renderEntries(entries);
    if (force) {
      setStatus("History refreshed.", "success");
    }
  } catch (error) {
    renderEntries([]);
    setStatus(errorMessage(error), "error");
  } finally {
    setBusy(false);
  }
}

function ensureSavedSettings(): AppSettings {
  const settings = readSettingsForm();
  const errors = validateSettings(settings);
  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }
  saveSettings(settings);
  return settings;
}

function readSettingsForm(): AppSettings {
  const settings: AppSettings = {
    tenantId: inputValue("tenant-id"),
    clientId: inputValue("client-id"),
    environment: normalizeEnvironment(inputValue("environment")),
    companyId: inputValue("company-id")
  };
  const employeeId = inputValue("employee-id");
  const defaultJobNumber = inputValue("default-job-number");

  if (employeeId) {
    settings.employeeId = employeeId;
  }
  if (defaultJobNumber) {
    settings.defaultJobNumber = defaultJobNumber;
  }

  return settings;
}

function hydrateSettingsForm(settings: AppSettings | undefined): void {
  setInputValue("tenant-id", settings?.tenantId ?? "");
  setInputValue("client-id", settings?.clientId ?? "");
  setInputValue("environment", settings?.environment ?? "production");
  setInputValue("company-id", settings?.companyId ?? "");
  setInputValue("employee-id", settings?.employeeId ?? "");
  setInputValue("default-job-number", settings?.defaultJobNumber ?? "");
  elements.entryJobNumber.value = settings?.defaultJobNumber ?? "";
}

function renderWorkItem(): void {
  elements.workItemSummary.textContent =
    workItem.id > 0 ? `${workItem.type} #${workItem.id}: ${workItem.title}` : "Local development preview";
}

function renderEntries(entries: BusinessCentralTimeEntry[]): void {
  const total = entries.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
  elements.totalHours.textContent = formatHours(total);

  if (entries.length === 0) {
    elements.entryList.innerHTML = '<p class="empty">No Business Central entries found for this work item.</p>';
    resizeExtension(document.body.scrollHeight + 16);
    return;
  }

  elements.entryList.innerHTML = entries
    .map(
      (entry) => `
        <article class="entry-card">
          <div>
            <strong>${escapeHtml(entry.date)}</strong>
            <span>${escapeHtml(entry.status ?? "Open")}</span>
          </div>
          <strong>${formatHours(Number(entry.quantity || 0))}</strong>
          <p>${escapeHtml(entry.description ?? "No description")}</p>
          ${entry.jobNumber ? `<small>Job ${escapeHtml(entry.jobNumber)}</small>` : ""}
        </article>
      `
    )
    .join("");
  resizeExtension(document.body.scrollHeight + 16);
}

function updateConnectionBadge(): void {
  const token = getAuthToken();
  if (isTokenUsable(token)) {
    elements.connectionBadge.textContent = "Connected";
    elements.connectionBadge.className = "badge success";
    return;
  }

  if (token) {
    elements.connectionBadge.textContent = "Reconnect";
    elements.connectionBadge.className = "badge warning";
    return;
  }

  elements.connectionBadge.textContent = "Disconnected";
  elements.connectionBadge.className = "badge neutral";
}

function setBusy(isBusy: boolean): void {
  elements.submitEntry.disabled = isBusy;
  elements.refreshHistory.disabled = isBusy;
  elements.connectButton.disabled = isBusy;
}

function setStatus(message: string, kind: "success" | "error" | "neutral" = "neutral"): void {
  elements.statusLine.textContent = message;
  elements.statusLine.className = `status-line ${kind}`;
  resizeExtension(document.body.scrollHeight + 16);
}

function inputValue(id: string): string {
  return byId<HTMLInputElement>(id).value.trim();
}

function setInputValue(id: string, value: string): void {
  byId<HTMLInputElement>(id).value = value;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("401") || error.message.includes("Unauthorized")) {
      clearAuthToken();
      updateConnectionBadge();
    }
    return error.message;
  }
  return String(error);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return replacements[char] ?? char;
  });
}

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element #${id}`);
  }
  return element as T;
}
