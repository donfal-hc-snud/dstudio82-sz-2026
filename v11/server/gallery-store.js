import { get, put, BlobPreconditionFailedError } from '@vercel/blob';
import { appendTrace, emptyGallery } from '../src/shared-model.js';

const prefix = process.env.VERCEL_ENV === 'preview' ? 'preview/' : '';
const indexPath = `${prefix}gallery/index.json`;
const options = { access: 'private', addRandomSuffix: false, contentType: 'application/json' };

export async function readJson(path) {
  const result = await get(path, { access: 'private', useCache: false });
  if (!result) return null;
  return { value: await new Response(result.stream).json(), etag: result.blob.etag.replace(/^W\//, '') };
}

export async function readGallery() {
  return (await readJson(indexPath))?.value ?? emptyGallery();
}

export async function saveTrace(input) {
  const archivePath = `${prefix}archive/${input.id}.json`;
  let archived = await readJson(archivePath);
  if (!archived) {
    try {
      await put(archivePath, JSON.stringify(input), options);
      archived = { value: input };
    } catch (error) {
      archived = await readJson(archivePath);
      if (!archived) throw error;
    }
  }
  const trace = archived.value;
  for (let attempt = 0; attempt < 12; attempt++) {
    const current = await readJson(indexPath);
    const gallery = current?.value ?? emptyGallery();
    const next = appendTrace(gallery, trace);
    if (next === gallery) return gallery;
    try {
      await put(indexPath, JSON.stringify(next), {
        ...options,
        ...(current ? { ifMatch: current.etag } : {})
      });
      return next;
    } catch (error) {
      // Concurrent visitors must retry against the new index, never overwrite it.
      const conflict = error instanceof BlobPreconditionFailedError || /already exists|rate.?limit/i.test(error.message);
      if (!conflict) throw error;
      await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 350));
    }
  }
  throw new Error('Gallery is busy. Retry the same trace ID.');
}
