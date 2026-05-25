import { BACKGROUNDS as ALL_BACKGROUNDS } from '../products/physical/config.js';
import { getPosterSubmissionsClient } from './poster-submissions.js';
import { POSTER_SCHOOLS_TABLE } from './supabase-config.js';
import { getSchoolConfig as getFallbackSchoolConfig } from './schools-config.js';

export const DEFAULT_SCHOOL_SLUG = 'default';

export const DEFAULT_SCHOOL_QUESTIONS = [
  ['projectName', 'שם המיזם', 20],
  ['studentNames', 'שמות התלמידות', 80],
  ['className', 'כיתה', 30],
  ['schoolName', 'בית הספר', 50],
  ['description', 'תיאור קצר של המיזם', 75],
  ['problem', 'מה הבעיה שזיהיתן?', 130],
  ['audience', 'על מי הבעיה משפיעה?', 75],
  ['researchQuestion', 'מה הייתה שאלת החקר הטכנולוגית?', 90],
  ['research_1', 'איזה חקר ביצעתן? 1', 42],
  ['research_2', 'איזה חקר ביצעתן? 2', 42],
  ['research_3', 'איזה חקר ביצעתן? 3', 42],
  ['findings', 'מה גיליתן בעקבות החקר?', 110],
  ['requirements_1', 'מה היה חשוב שהפתרון יכלול? 1', 42],
  ['requirements_2', 'מה היה חשוב שהפתרון יכלול? 2', 42],
  ['requirements_3', 'מה היה חשוב שהפתרון יכלול? 3', 42],
  ['solution', 'מה הפתרון שפיתחתן?', 130],
  ['howItWorks_1', 'איך הפתרון עובד? 1', 42],
  ['howItWorks_2', 'איך הפתרון עובד? 2', 42],
  ['howItWorks_3', 'איך הפתרון עובד? 3', 42],
  ['value', 'מה הערך המרכזי של הפתרון?', 110],
  ['feedbackReceived', 'מה המשוב שקיבלנו?', 110],
  ['improvementsAfterFeedback', 'מה שיפרנו בעקבות המשוב?', 110],
  ['slogan', 'סלוגן לתחתית הפוסטר', 60]
];

const HEBREW_TRANSLITERATION = {
  א: 'a', ב: 'b', ג: 'g', ד: 'd', ה: 'h', ו: 'v', ז: 'z', ח: 'ch', ט: 't', י: 'y', כ: 'k', ך: 'k', ל: 'l', מ: 'm', ם: 'm',
  נ: 'n', ן: 'n', ס: 's', ע: 'a', פ: 'p', ף: 'p', צ: 'tz', ץ: 'tz', ק: 'k', ר: 'r', ש: 'sh', ת: 't'
};

async function getClient() {
  return getPosterSubmissionsClient();
}

function normalizeSlugPart(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[א-ת]/g, (letter) => HEBREW_TRANSLITERATION[letter] || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function slugifySchoolName(name) {
  return normalizeSlugPart(name) || `school-${Date.now().toString(36)}`;
}

export function normalizeQuestionConfig(questionsConfig) {
  if (!Array.isArray(questionsConfig)) return null;
  const byId = new Map(DEFAULT_SCHOOL_QUESTIONS.map(([id, label, maxChars]) => [id, { id, label, maxChars }]));
  questionsConfig.forEach((item) => {
    const id = item?.id || item?.[0];
    if (!byId.has(id)) return;
    const fallback = byId.get(id);
    const label = String(item?.label ?? item?.[1] ?? fallback.label).trim() || fallback.label;
    const maxChars = Number(item?.maxChars ?? item?.max_chars ?? item?.[2] ?? fallback.maxChars);
    byId.set(id, { id, label, maxChars: Number.isFinite(maxChars) && maxChars > 0 ? Math.round(maxChars) : fallback.maxChars });
  });
  return DEFAULT_SCHOOL_QUESTIONS.map(([id]) => byId.get(id));
}

export function questionsToTriples(questionsConfig) {
  const normalized = normalizeQuestionConfig(questionsConfig);
  return normalized ? normalized.map(({ id, label, maxChars }) => [id, label, maxChars]) : null;
}

export function normalizeSchoolRow(row) {
  if (!row) return null;
  const backgroundIds = Array.isArray(row.background_ids) ? row.background_ids.filter(Boolean) : [];
  const questionsConfig = normalizeQuestionConfig(row.questions_config);
  return {
    id: row.id || null,
    created_at: row.created_at || null,
    school_name: row.school_name || '',
    school_slug: row.school_slug || DEFAULT_SCHOOL_SLUG,
    logo_data: row.logo_data || row.logo_url || null,
    logo_url: row.logo_url || null,
    background_ids: backgroundIds,
    questions_config: questionsConfig,
    is_active: row.is_active !== false
  };
}

export async function listPosterSchools() {
  const client = await getClient();
  if (!client) return [];
  const { data, error } = await client
    .from(POSTER_SCHOOLS_TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizeSchoolRow);
}

export async function fetchPosterSchoolBySlug(slug) {
  const normalizedSlug = slug || DEFAULT_SCHOOL_SLUG;
  if (normalizedSlug === DEFAULT_SCHOOL_SLUG) return null;
  const client = await getClient();
  if (!client) return null;
  const { data, error } = await client
    .from(POSTER_SCHOOLS_TABLE)
    .select('*')
    .eq('school_slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return normalizeSchoolRow(data);
}

export async function createPosterSchool(payload) {
  const client = await getClient();
  if (!client) throw new Error('Supabase לא מוגדר.');
  const { data, error } = await client
    .from(POSTER_SCHOOLS_TABLE)
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return normalizeSchoolRow(data);
}

export async function updatePosterSchool(id, payload) {
  const client = await getClient();
  if (!client) throw new Error('Supabase לא מוגדר.');
  const { data, error } = await client
    .from(POSTER_SCHOOLS_TABLE)
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return normalizeSchoolRow(data);
}

export async function deletePosterSchool(id) {
  const client = await getClient();
  if (!client) throw new Error('Supabase לא מוגדר.');
  const { error } = await client
    .from(POSTER_SCHOOLS_TABLE)
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function buildUniqueSchoolSlug(name, existingId = null) {
  const base = slugifySchoolName(name);
  const client = await getClient();
  if (!client) return base;
  let slug = base;
  let suffix = 2;
  while (true) {
    let query = client.from(POSTER_SCHOOLS_TABLE).select('id').eq('school_slug', slug).limit(1);
    const { data, error } = await query;
    if (error) throw error;
    const conflict = (data || []).find((row) => row.id !== existingId);
    if (!conflict) return slug;
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function resolveSchoolConfig(slug) {
  const requestedSlug = slug || DEFAULT_SCHOOL_SLUG;
  const fallbackConfig = getFallbackSchoolConfig(requestedSlug) || getFallbackSchoolConfig(DEFAULT_SCHOOL_SLUG);
  if (requestedSlug === DEFAULT_SCHOOL_SLUG) return { ...fallbackConfig, slug: DEFAULT_SCHOOL_SLUG, known: true, source: 'default' };

  try {
    const row = await fetchPosterSchoolBySlug(requestedSlug);
    if (row) {
      const selectedBackgrounds = row.background_ids.length
        ? row.background_ids.map((id) => ALL_BACKGROUNDS.find((bg) => bg.id === id)).filter(Boolean)
        : null;
      return {
        slug: row.school_slug,
        name: row.school_name,
        logo: row.logo_data || row.logo_url || null,
        backgrounds: selectedBackgrounds && selectedBackgrounds.length ? selectedBackgrounds : null,
        questions: row.questions_config ? questionsToTriples(row.questions_config) : null,
        known: true,
        source: 'database'
      };
    }
  } catch (err) {
    console.warn('Could not load school configuration from Supabase.', err);
  }

  if (fallbackConfig && requestedSlug === fallbackConfig.slug) return { ...fallbackConfig, known: true, source: 'fallback' };
  return { ...(getFallbackSchoolConfig(DEFAULT_SCHOOL_SLUG) || {}), slug: DEFAULT_SCHOOL_SLUG, known: false, requestedSlug, source: 'default' };
}

export function getStudentLink(slug, origin = window.location.origin) {
  const url = new URL('/poster-builder/', origin);
  if (slug && slug !== DEFAULT_SCHOOL_SLUG) url.searchParams.set('school', slug);
  url.searchParams.set('fresh', '1');
  return url.toString();
}
