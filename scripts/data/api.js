import { fetchJSON } from '../core/utils.js';
import { slugify } from '../core/utils.js';
import { stripHTML } from '../core/utils.js';

export const CONFIG = {
  jsonPath: 'assets/albums.json',
  notesPath: 'assets/notes.json',
  coversDir: 'assets/covers',
  coverCandidates: ['webp', 'jpg', 'png'],
  defaultCover: 'assets/covers/cover-default.webp',
};

let albumsCache;
export async function getAlbums() {
  if (!albumsCache) {
    let raw;
    try {
      raw = await fetchJSON(CONFIG.jsonPath);
    } catch (e) {
      console.error('[data/api] failed to fetch albums.json', e);
      albumsCache = [];
      return albumsCache;
    }
    const notesRaw = await (async () => {
      try {
        const n = await fetchJSON(CONFIG.notesPath);
        return Array.isArray(n) ? n : [];
      } catch (e) {
        console.warn('[data/api] failed to fetch notes.json, continuing without notes', e);
        return [];
      }
    })();
    const notesBySlug = new Map();
    for (const n of notesRaw) {
      const slug = n.slug || slugify(n.title || '');
      notesBySlug.set(slug, n);
    }
  albumsCache = (Array.isArray(raw) ? raw : []).map(a => {
      const noteObj = notesBySlug.get(slugify(a.slug || a.title || '')) || null;
      return {
        ...a,
        notes: noteObj ? normalizeNotes(noteObj) : [],
        note: noteObj
      };
  }).filter(a => !a.hidden);
  }
  return albumsCache;
}

export function normalizeNotes(n) {
  const out = [];
  if (!n) return out;
  if (n.blurb) out.push(n.blurb);
  if (n.title && !n.blurb) out.push(n.title);
  if (Array.isArray(n.sections)) {
    for (const s of n.sections) {
      const sectTitle = s['section-title'] || s.title;
      if (sectTitle) out.push({ type: 'title', text: sectTitle });
      if (s.body) out.push({ type: 'text', text: stripHTML(s.body).slice(0, 200) });
    }
  }
  if (n.body && out.length === 0) out.push(stripHTML(n.body).slice(0, 200));
  return out;
}

export async function resolveCover(album) {
  if (album.cover) return album.cover;
  const slug = slugify(album.title || 'album');
  for (const ext of CONFIG.coverCandidates) {
    const url = `${CONFIG.coversDir}/${slug}.${ext}`;
    try {
      const res = await fetch(url, { method: 'GET', cache: 'no-store' });
      if (res.ok) return url;
    } catch (e) {
      console.debug('[data/api] cover fetch failed for', url, e);
    }
  }
  return CONFIG.defaultCover;
}
