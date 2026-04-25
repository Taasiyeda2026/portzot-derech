const STORAGE_KEY = 'poster-builder-autosave-v1';
const REQUIRED_CONTENT_KEYS = ['student1', 'student2', 'student3', 'className', 'schoolName', 'feedbackReceived', 'improvementsAfterFeedback'];
const REQUIRED_SPLIT_RESEARCH_KEYS = ['studentNames', 'className', 'schoolName', 'feedbackAndImprovements'];

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...payload, updatedAt: Date.now() }));
}

export function loadProject() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return migrateProjectShape(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearProject() {
  localStorage.removeItem(STORAGE_KEY);
}
