export function slugify(str = '') {
  return String(str)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function isFuture(dateStr) {
  if (!dateStr) return true;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return true;
  return d.getTime() > Date.now();
}

export function formatFancyDate(dateStr) {
  const UI = (typeof getUI === 'function') ? getUI() : { upcoming: 'Upcoming' };
  if (!dateStr) return UI.upcoming || 'Upcoming';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return UI.upcoming || 'Upcoming';
  if (d.getTime() > Date.now()) return UI.upcoming || 'Upcoming';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export async function fetchJSON(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} loading ${path}`);
  return res.json();
}

import { $ } from './dom.js';

export function setCopyrightYear() {
  const el = $("#year");
  if (el) el.textContent = new Date().getFullYear();
}

export function capitalize(s = '') {
  s = String(s);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function stripHTML(input = '') {
  return String(input).replace(/<[^>]*>/g, '');
}

// Render a very small, safe subset of Markdown inline features to HTML.
// Escapes input then converts links, bold, and italics. Intended for
// trusted content in assets but keeps a minimal XSS-safe escape step.
export function renderInlineMarkdown(input = '') {
  const s = String(input || '');
  // basic HTML escape
  const escapeHtml = (str) => String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  let out = escapeHtml(s);

  // convert markdown links [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, text, url) => {
    // allow only safe-ish url characters; leave raw if suspicious
    const safeUrl = String(url).replace(/\"/g, '%22');
    return `<a href="${safeUrl}" target="_blank" rel="noopener">${text}</a>`;
  });

  // bold **text** -> <strong>
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // italics *text* -> <em>
  out = out.replace(/\*(.+?)\*/g, '<em>$1</em>');

  return out;
}

// getUI depends on DOM; we export a factory that reads from document when first called
let _UI_CACHE = null;
export function getUI() {
  if (_UI_CACHE) return _UI_CACHE;
  const body = document.body || {};
  const descEl = document.getElementById('release-description');
  _UI_CACHE = {
    // Prefer explicit dataset on <body> to avoid querying page-specific elements by id.
    listen: body.dataset.listenLabel || 'Listen',
  spotify: body.dataset.spotifyLabel || 'Spotify',
  // support both appleMusic and apple label dataset keys; default to 'Apple Music'
  appleMusic: body.dataset.appleMusicLabel || body.dataset.appleLabel || 'Apple Music',
  apple: body.dataset.appleLabel || 'Apple Music',
    upcoming: body.dataset.upcoming || 'Upcoming',
    newestTitle: body.dataset.newestTitle || 'Newest Release',
    upcomingTitle: body.dataset.upcomingTitle || 'Upcoming Releases',
    loadError: body.dataset.loadError || (descEl && descEl.dataset && descEl.dataset.default) || `Couldn\u2019t load albums right now. Please try again later.`,
    featuredLabel: body.dataset.featuredLabel || 'Featured',
    latestRelease: body.dataset.latestRelease || 'Latest Release',
    singleLabel: body.dataset.singleLabel || 'Single'
  };
  _UI_CACHE.close = body.dataset.closeLabel || 'Close';
  _UI_CACHE.youtube = body.dataset.youtubeLabel || 'YouTube';
  _UI_CACHE.noFeatured = body.dataset.noFeatured || 'No featured release.';
  return _UI_CACHE;
}

// small helper to allow other modules to use $ without circular import
export function setDollar(fn) {
  // noop; placeholder if we want to override $ from dom module
}
