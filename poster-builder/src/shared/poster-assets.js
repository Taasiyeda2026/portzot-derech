import { getPosterSubmissionsClient } from './poster-submissions.js';
import { POSTER_ASSETS_TABLE } from './supabase-config.js';

export async function listPosterAssets() {
  const c = getPosterSubmissionsClient();
  if (!c) return [];
  const { data, error } = await c
    .from(POSTER_ASSETS_TABLE)
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createPosterAsset({ name, asset_type, school_name, image_data }) {
  const c = getPosterSubmissionsClient();
  if (!c) throw new Error('Supabase לא מוגדר.');
  const { data, error } = await c
    .from(POSTER_ASSETS_TABLE)
    .insert({ name, asset_type, school_name: school_name || null, image_data, is_active: true })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePosterAssetImage(id, image_data) {
  const c = getPosterSubmissionsClient();
  if (!c) throw new Error('Supabase לא מוגדר.');
  const { error } = await c
    .from(POSTER_ASSETS_TABLE)
    .update({ image_data })
    .eq('id', id);
  if (error) throw error;
}

export async function deactivatePosterAsset(id) {
  const c = getPosterSubmissionsClient();
  if (!c) throw new Error('Supabase לא מוגדר.');
  const { error } = await c
    .from(POSTER_ASSETS_TABLE)
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw error;
}

export async function findSchoolLogoAssets(schoolName) {
  const c = getPosterSubmissionsClient();
  if (!c || !schoolName) return [];
  const { data, error } = await c
    .from(POSTER_ASSETS_TABLE)
    .select('*')
    .eq('is_active', true)
    .eq('asset_type', 'school_logo')
    .ilike('school_name', schoolName.trim());
  if (error) throw error;
  return data || [];
}
