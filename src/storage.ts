import type { AppSettings, AuthToken, LocalEntryReference } from "./types";

const SETTINGS_KEY = "devops-bc-timetracker.settings";
const TOKEN_KEY = "devops-bc-timetracker.auth-token";
const PKCE_KEY = "devops-bc-timetracker.pkce";
const ENTRY_REFERENCES_KEY = "devops-bc-timetracker.entry-references";

interface PkceState {
  state: string;
  verifier: string;
  redirectUri: string;
}

function readJson<T>(key: string): T | undefined {
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    window.localStorage.removeItem(key);
    return undefined;
  }
}

function writeJson(key: string, value: unknown): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getSettings(): AppSettings | undefined {
  return readJson<AppSettings>(SETTINGS_KEY);
}

export function saveSettings(settings: AppSettings): void {
  writeJson(SETTINGS_KEY, settings);
}

export function getAuthToken(): AuthToken | undefined {
  return readJson<AuthToken>(TOKEN_KEY);
}

export function saveAuthToken(token: AuthToken): void {
  writeJson(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

export function savePkceState(state: PkceState): void {
  writeJson(PKCE_KEY, state);
}

export function takePkceState(): PkceState | undefined {
  const state = readJson<PkceState>(PKCE_KEY);
  window.localStorage.removeItem(PKCE_KEY);
  return state;
}

export function saveEntryReference(reference: LocalEntryReference): void {
  const references = readJson<LocalEntryReference[]>(ENTRY_REFERENCES_KEY) ?? [];
  references.unshift(reference);
  writeJson(ENTRY_REFERENCES_KEY, references.slice(0, 100));
}

export function getEntryReferences(workItemId: number): LocalEntryReference[] {
  const references = readJson<LocalEntryReference[]>(ENTRY_REFERENCES_KEY) ?? [];
  return references.filter((reference) => reference.workItemId === workItemId);
}
