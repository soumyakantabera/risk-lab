export const getProjectStorageKey = (projectId: string, area: string) =>
  `valuation-lab-pro:${projectId}:${area}`;

export const loadProjectState = <T>(projectId: string, area: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(getProjectStorageKey(projectId, area));
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const saveProjectState = <T>(projectId: string, area: string, value: T) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getProjectStorageKey(projectId, area), JSON.stringify(value));
};
