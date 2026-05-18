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
    fieldSettings: project.fieldSettings || {},
    titleStyle: project.titleStyle || {},
    slotImages: project.slotImages || {},
    splitFlowState: project.splitFlowState || null
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
