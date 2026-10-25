// Deployment-controlled initialization of this game's one private bucket.
// Uses the Storage API; never writes storage schema metadata through SQL.
// The same helper also supports a read-only operator preflight (the default).
// Some Storage versions send HTTP 400 with the documented semantic status/code
// in the response body. Test those fields independently; never accept generic 400.
function isMissingBucket(error) {
  return Boolean(error && (String(error.status) === '404' || String(error.statusCode) === '404' || error.code === 'NoSuchBucket'));
}
function isBucketConflict(error) {
  return Boolean(error && (String(error.status) === '409' || String(error.statusCode) === '409' ||
    ['BucketAlreadyExists', 'ResourceAlreadyExists'].includes(error.code)));
}
export async function prepareStorage(storage, { apply = false } = {}) {
  const id = 'inspiration-cards';
  const existing = await storage.getBucket(id);
  if ((existing.error && !isMissingBucket(existing.error)) || (existing.data && existing.error)) {
    throw new Error('Unable to verify bucket configuration. No changes were made.');
  }
  if (existing.data && !existing.error) {
    if (existing.data.public !== false) throw new Error('The existing inspiration-cards bucket is public. Stop and review it before enabling the game.');
    return { status: 'private-existing', id };
  }
  if (!isMissingBucket(existing.error)) {
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
  if (created.error && !isBucketConflict(created.error)) {
    throw new Error('Private bucket creation failed. No credentials are included in this error.');
  }
  const verified = await storage.getBucket(id);
  if (verified.error || verified.data?.public !== false) {
    throw new Error('The new bucket could not be verified as private. Do not enable the game.');
  }
  return { status: created.error ? 'private-existing' : 'private-created', id };
}
