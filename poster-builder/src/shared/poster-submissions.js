import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY, POSTER_SUBMISSIONS_TABLE } from './supabase-config.js';

let supabaseClient = null;

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getPosterSubmissionsClient() {
  if (!hasSupabaseConfig()) return null;
  if (!supabaseClient) supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabaseClient;
}

export function buildStudentNames(contentValues = {}) {
  const splitNames = typeof contentValues.studentNames === 'string'
    ? contentValues.studentNames.split(/[\n,;|]+/)
    : [];
  return [contentValues.student1, contentValues.student2, contentValues.student3, ...splitNames]
    .map((value) => (value || '').trim())
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .join(', ');
}

export function normalizePosterData(project = {}) {
  const background = project.background || null;
  return {
    posterSize: project.posterSize || 'A4',
    productType: project.productType || 'physical',
    school_slug: project.school_slug || 'default',
    background,
    backgroundPath: project.backgroundPath || background,
    backgroundId: project.backgroundId || null,
    contentValues: project.contentValues || {},
    promptAnswers: project.promptAnswers || {},
    fieldSettings: project.fieldSettings || {},
    titleStyle: project.titleStyle || {},
    slotImages: project.slotImages || {},
    splitFlowState: project.splitFlowState || null,
    image_prompts: project.image_prompts || null
  };
}

const EMPTY_IMAGE_PROMPTS = {
  visual_style: '',
  realism_level: '',
  important_colors: '',
  avoid_showing: '',
  main_image_prompt: '',
  problem_image_prompt: '',
  solution_image_prompt: '',
  prototype_image_prompt: '',
  background_prompt: '',
  screens: []
};

const EMPTY_SCREEN_PROMPT = {
  screen_number: '',
  screen_type: '',
  what_we_see: '',
  what_user_does: '',
  components: '',
  what_stands_out: '',
  what_to_understand: '',
  main_focus: '',
  secondary_elements: ''
};

function normalizeScreenPrompt(screen = {}, fallbackNumber = '') {
  const current = (screen && typeof screen === 'object') ? screen : {};
  const normalized = { ...current };
  Object.keys(EMPTY_SCREEN_PROMPT).forEach((key) => {
    if (key === 'screen_number') {
      normalized[key] = String(current[key] || fallbackNumber || '');
      return;
    }
    normalized[key] = String(current[key] || '');
  });
  return normalized;
}

export function normalizeImagePrompts(value = {}) {
  const current = (value && typeof value === 'object') ? value : {};
  const normalized = { ...current };
  Object.keys(EMPTY_IMAGE_PROMPTS).forEach((key) => {
    if (key === 'screens') return;
    normalized[key] = String(current[key] || '');
  });
  const screens = Array.isArray(current.screens) ? current.screens : [];
  normalized.screens = screens.map((screen, index) => normalizeScreenPrompt(screen, index + 1));
  return {
    ...EMPTY_IMAGE_PROMPTS,
    ...normalized
  };
}

function buildSubmissionRow(project) {
  const posterData = normalizePosterData(project);
  const contentValues = posterData.contentValues || {};
  return {
    project_name: contentValues.projectName || null,
    student_names: buildStudentNames(contentValues) || null,
    class_name: contentValues.className || null,
    school_name: contentValues.schoolName || null,
    product_type: posterData.productType,
    school_slug: posterData.school_slug || 'default',
    poster_data: posterData
  };
}

export async function createPosterSubmission(project) {
  const client = getPosterSubmissionsClient();
  if (!client) throw new Error('Poster submissions are not configured.');

  const { data, error } = await client
    .from(POSTER_SUBMISSIONS_TABLE)
    .insert(buildSubmissionRow(project))
    .select('id')
    .single();

  if (error) throw error;
  return data?.id || null;
}

export async function createPosterSubmissions(projects) {
  const client = getPosterSubmissionsClient();
  if (!client) throw new Error('Poster submissions are not configured.');
  if (!Array.isArray(projects) || projects.length === 0) return;

  const { error } = await client
    .from(POSTER_SUBMISSIONS_TABLE)
    .insert(projects.map(buildSubmissionRow));

  if (error) throw error;
}

export async function listPosterSubmissions() {
  const client = getPosterSubmissionsClient();
  if (!client) throw new Error('Poster submissions are not configured.');
  const { data, error } = await client
    .from(POSTER_SUBMISSIONS_TABLE)
    .select('id, created_at, project_name, student_names, class_name, school_name, product_type, school_slug')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchPosterSubmission(id) {
  const client = getPosterSubmissionsClient();
  if (!client) throw new Error('Poster submissions are not configured.');
  const { data, error } = await client
    .from(POSTER_SUBMISSIONS_TABLE)
    .select('id, poster_data, product_type')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function listPitchGroupsForPoster() {
  const client = getPosterSubmissionsClient();
  if (!client) throw new Error('Poster submissions are not configured.');
  const { data, error } = await client
    .from('pitch_groups')
    .select('id, group_code, group_name, project_name, data_json')
    .order('group_code', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchPosterSubmissionByGroup(groupId) {
  const client = getPosterSubmissionsClient();
  if (!client) throw new Error('Poster submissions are not configured.');
  const { data, error } = await client
    .from(POSTER_SUBMISSIONS_TABLE)
    .select('id, poster_data, product_type, pitch_group_id, pitch_group_code')
    .eq('pitch_group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function upsertPosterSubmissionForGroup(group, project, imagePrompts = EMPTY_IMAGE_PROMPTS) {
  const client = getPosterSubmissionsClient();
  if (!client) throw new Error('Poster submissions are not configured.');
  const existing = await fetchPosterSubmissionByGroup(group.id);
  const row = buildSubmissionRow(project);
  const normalizedPrompts = normalizeImagePrompts(imagePrompts);
  const previousData = existing?.poster_data && typeof existing.poster_data === 'object' ? existing.poster_data : {};
  row.poster_data = {
    ...previousData,
    ...row.poster_data,
    image_prompts: {
      ...normalizeImagePrompts(previousData.image_prompts || {}),
      ...normalizedPrompts
    }
  };
  row.pitch_group_id = group.id;
  row.pitch_group_code = group.group_code || null;

  if (existing?.id) {
    const { data, error } = await client
      .from(POSTER_SUBMISSIONS_TABLE)
      .update(row)
      .eq('id', existing.id)
      .select('id')
      .single();
    if (error) throw error;
    return data?.id || existing.id;
  }

  const { data, error } = await client
    .from(POSTER_SUBMISSIONS_TABLE)
    .insert(row)
    .select('id')
    .single();
  if (error) throw error;
  return data?.id || null;
}

export async function updatePosterSubmission(id, project) {
  const client = getPosterSubmissionsClient();
  if (!client) throw new Error('Poster submissions are not configured.');

  const { error } = await client
    .from(POSTER_SUBMISSIONS_TABLE)
    .update(buildSubmissionRow(project))
    .eq('id', id);

  if (error) throw error;
}

export async function deletePosterSubmission(id) {
  const client = getPosterSubmissionsClient();
  if (!client) throw new Error('Poster submissions are not configured.');
  const { error } = await client
    .from(POSTER_SUBMISSIONS_TABLE)
    .delete()
    .eq('id', id);
  if (error) throw error;
}
