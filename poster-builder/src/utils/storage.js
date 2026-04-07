const STORAGE_KEY = 'poster-builder-autosave-v1';

export function saveProject(payload) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...payload, updatedAt: Date.now() }));
}

export function loadProject() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearProject() {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasSavedProject() {
  return Boolean(localStorage.getItem(STORAGE_KEY));
}
