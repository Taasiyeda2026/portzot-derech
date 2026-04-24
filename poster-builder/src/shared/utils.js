export function clampText(value, max) {
  return String(value || '').slice(0, max);
}

export function pickExistingType(type, allowed, fallback) {
  return allowed.includes(type) ? type : fallback;
}
