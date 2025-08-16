// scripts/albums-service.js

import { CONFIG } from './config.js';
import { slugify, fetchJSON } from './utils.js';

let albumsCache;
export async function getAlbums() {
  if (!albumsCache) {
    const raw = await fetchJSON(CONFIG.jsonPath);
    albumsCache = Array.isArray(raw) ? raw : [];
  }
  return albumsCache;
}

export async function resolveCover(album) {
  if (album.cover) return album.cover;
  const slug = slugify(album.title || 'album');
  for (const ext of CONFIG.coverCandidates) {
    const url = `${CONFIG.coversDir}/${slug}.${ext}`;
    try {
      const res = await fetch(url, { method: 'GET', cache: 'no-store' });
      if (res.ok) return url;
    } catch (_) {
      // ignore and try next extension
    }
  }
  return CONFIG.defaultCover;
}
