import * as SDK from "azure-devops-extension-sdk";
import type { WorkItemContext } from "./types";

interface WorkItemFormService {
  getId(): Promise<number>;
  getFieldValue(fieldName: string): Promise<unknown>;
}

function isHostedByAzureDevOps(): boolean {
  return window.parent !== window;
}

export async function initializeAzureDevOps(): Promise<void> {
  if (!isHostedByAzureDevOps()) {
    return;
  }

  await SDK.init({ loaded: false, applyTheme: true });
}

export async function notifyLoaded(): Promise<void> {
  if (!isHostedByAzureDevOps()) {
    return;
  }

  await SDK.notifyLoadSucceeded();
}

export async function notifyLoadFailed(error: Error): Promise<void> {
  if (!isHostedByAzureDevOps()) {
    return;
  }

  await SDK.notifyLoadFailed(error);
}

export function resizeExtension(height?: number): void {
  if (!isHostedByAzureDevOps()) {
    return;
  }

  try {
    SDK.resize(undefined, height);
  } catch {
    // Resize is host-only; local demo mode can ignore it.
  }
}

export async function getWorkItemContext(): Promise<WorkItemContext> {
  if (!isHostedByAzureDevOps()) {
    return localWorkItemContext();
  }

  try {
    const service = await SDK.getService<WorkItemFormService>("ms.vss-work-web.work-item-form");
    const [id, title, type] = await Promise.all([
      service.getId(),
      service.getFieldValue("System.Title"),
      service.getFieldValue("System.WorkItemType")
    ]);
    const webContext = SDK.getWebContext();
    const hostContext = SDK.getHost();
    const user = SDK.getUser();
    const context: WorkItemContext = {
      id,
      title: String(title || "Untitled work item"),
      type: String(type || "Work Item"),
      url: buildWorkItemUrl(webContext, hostContext, id)
    };

    if (webContext.project?.name) {
      context.projectName = webContext.project.name;
    }
    if (user?.name?.includes("@")) {
      context.userEmail = user.name;
    }

    return context;
  } catch {
    return localWorkItemContext();
  }
}

function localWorkItemContext(): WorkItemContext {
  return {
    id: 0,
    title: "Local development work item",
    type: "Task",
    url: window.location.href
  };
}

function buildWorkItemUrl(
  webContext: ReturnType<typeof SDK.getWebContext>,
  hostContext: ReturnType<typeof SDK.getHost>,
  id: number
): string {
  const projectName = webContext.project?.name;

  if (hostContext.name && projectName) {
    return `https://dev.azure.com/${encodeURIComponent(hostContext.name)}/${encodeURIComponent(projectName)}/_workitems/edit/${id}`;
  }

  return window.location.href;
}
