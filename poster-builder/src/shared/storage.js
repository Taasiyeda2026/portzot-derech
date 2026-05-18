export const STORAGE_KEY = 'poster-builder-autosave-v1';
const REQUIRED_CONTENT_KEYS = ['student1', 'student2', 'student3', 'className', 'schoolName', 'feedbackReceived', 'improvementsAfterFeedback'];
const REQUIRED_SPLIT_RESEARCH_KEYS = ['studentNames', 'className', 'schoolName', 'feedbackAndImprovements'];

function getUrlSchoolSlug() {
  try {
    return new URLSearchParams(window.location.search).get('school') || 'default';
  } catch {
    return 'default';
  }
}

export function getSchoolScopedStorageKey(schoolSlug = getUrlSchoolSlug()) {
  const slug = (schoolSlug || 'default').toString().trim() || 'default';
  return `${STORAGE_KEY}:${slug}`;
}

function migrateProjectShape(project) {
  if (!project || typeof project !== 'object') return project;
  const next = { ...project };

  if (next.contentValues && typeof next.contentValues === 'object') {
    next.contentValues = { ...next.contentValues };
    REQUIRED_CONTENT_KEYS.forEach((key) => {
      if (typeof next.contentValues[key] !== 'string') next.contentValues[key] = '';
    });
  }

  if (next.splitFlowState && typeof next.splitFlowState === 'object') {
    next.splitFlowState = { ...next.splitFlowState };
    const research = { ...(next.splitFlowState.research || {}) };
    REQUIRED_SPLIT_RESEARCH_KEYS.forEach((key) => {
      if (typeof research[key] !== 'string') research[key] = '';
    });
    if (!research.feedbackAndImprovements) {
      const feedback = typeof research.feedback === 'string' ? research.feedback : '';
      const improvement = typeof research.improvement === 'string' ? research.improvement : '';
      research.feedbackAndImprovements = [feedback, improvement].filter(Boolean).join('\n');
    }
    next.splitFlowState.research = research;
  }

  return next;
}

export function saveProject(payload) {
  const project = { ...(payload || {}) };
  delete project.schoolLogoImage;
  delete project.schoolLogoAssetId;
  const schoolSlug = project.school_slug || getUrlSchoolSlug();
  project.school_slug = schoolSlug || 'default';
  localStorage.setItem(getSchoolScopedStorageKey(project.school_slug), JSON.stringify({ ...project, updatedAt: Date.now() }));
}

export function loadProject(schoolSlug = getUrlSchoolSlug()) {
  const scopedKey = getSchoolScopedStorageKey(schoolSlug);
  let raw = localStorage.getItem(scopedKey);

  if (!raw && (schoolSlug || 'default') === 'default') {
    raw = localStorage.getItem(STORAGE_KEY);
    if (raw) localStorage.setItem(scopedKey, raw);
  }

  if (!raw) return null;
  try {
    const project = migrateProjectShape(JSON.parse(raw));
    if (project && typeof project === 'object' && !project.school_slug) project.school_slug = schoolSlug || 'default';
    return project;
  } catch {
    return null;
  }
}

export function clearProject(schoolSlug = getUrlSchoolSlug()) {
  localStorage.removeItem(getSchoolScopedStorageKey(schoolSlug));
  if ((schoolSlug || 'default') === 'default') localStorage.removeItem(STORAGE_KEY);
}
