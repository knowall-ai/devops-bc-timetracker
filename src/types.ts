export interface AppSettings {
  tenantId: string;
  clientId: string;
  environment: string;
  companyId: string;
  employeeId?: string;
  defaultJobNumber?: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType: string;
}

export interface WorkItemContext {
  id: number;
  title: string;
  type: string;
  url: string;
  projectName?: string;
  userEmail?: string;
}

export interface TimeEntryDraft {
  date: string;
  hours: number;
  description: string;
  jobNumber?: string;
}

export interface BusinessCentralTimeEntry {
  id: string;
  date: string;
  quantity: number;
  description?: string;
  jobNumber?: string;
  jobTaskNumber?: string;
  status?: string;
  lastModifiedDateTime?: string;
}

export interface BusinessCentralCollection<T> {
  value: T[];
}

export interface LocalEntryReference {
  workItemId: number;
  businessCentralEntryId: string;
  createdAt: string;
}
