// Deployment-controlled initialization of this game's one private bucket.
// Uses the Storage API; never writes storage schema metadata through SQL.
// The same helper also supports a read-only operator preflight (the default).
export async function prepareStorage(storage, { apply = false } = {}) {
  const id = 'inspiration-cards';
  const existing = await storage.getBucket(id);
  if (existing.error && String(existing.error.status ?? existing.error.statusCode) !== '404') {
    throw new Error('Unable to verify bucket configuration. No changes were made.');
  }
  if (existing.data && !existing.error) {
    if (existing.data.public !== false) throw new Error('The existing inspiration-cards bucket is public. Stop and review it before enabling the game.');
    return { status: 'private-existing', id };
  }
  if (String(existing.error?.status ?? existing.error?.statusCode) !== '404') {
    throw new Error('Unable to verify bucket configuration. No changes were made.');
  }
  if (!apply) return { status: 'missing', id, instruction: 'After approval, repeat with --apply to create the private bucket.' };
  const created = await storage.createBucket(id, {
    public: false,
    fileSizeLimit: 12 * 1024 * 1024,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'],
  });
  // Concurrent cold starts can both observe a missing bucket. A conflict permits
  // a fresh privacy check, never an update or overwrite of the existing bucket.
  if (created.error && String(created.error.status ?? created.error.statusCode) !== '409') {
    throw new Error('Private bucket creation failed. No credentials are included in this error.');
  }
  const verified = await storage.getBucket(id);
  if (verified.error || verified.data?.public !== false) {
    throw new Error('The new bucket could not be verified as private. Do not enable the game.');
  }
  return { status: created.error ? 'private-existing' : 'private-created', id };
}
