// Determine whether a release date string represents a future release.
// Accepts an ISO-like date string (YYYY-MM-DD or any Date-parsable string).
// By default the comparison is done using local calendar dates (so the whole
// release day is considered released on that local day). Optionally, a
// timezone offset in hours can be provided (e.g. +1 for UTC+1) to evaluate
// release-day boundaries in that timezone.
export function isFuture(dateStr, tzOffsetHours = null) {
  if (!dateStr) return true; // missing date -> treat as not-yet-released

  // Try to parse simple YYYY-MM-DD cleanly to avoid JS timezone parsing quirks
  const parts = String(dateStr).split('-').map(Number);
  let releaseMidnightUTCms = null;

  if (parts.length === 3 && Number.isInteger(parts[0]) && Number.isInteger(parts[1]) && Number.isInteger(parts[2])) {
    const [y, m, d] = parts;
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
      if (tzOffsetHours === null) {
        // Use local timezone: create local midnight and compare to today's local midnight
        const releaseLocal = new Date(y, m - 1, d);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return releaseLocal.getTime() > today.getTime();
      } else {
        // Convert target-tz midnight to UTC ms. For a tz offset H, midnight in
        // that timezone expressed in UTC is Date.UTC(...) - H*3600000
        const tzOffsetMs = Number(tzOffsetHours) * 60 * 60 * 1000;
        releaseMidnightUTCms = Date.UTC(y, m - 1, d) - tzOffsetMs;

        // Compute today's midnight in the target timezone in UTC ms:
        const nowUtcMs = Date.now();
        const shifted = new Date(nowUtcMs + tzOffsetMs);
        const targetY = shifted.getUTCFullYear();
        const targetM = shifted.getUTCMonth();
        const targetD = shifted.getUTCDate();
        const todayMidnightUTCms = Date.UTC(targetY, targetM, targetD) - tzOffsetMs;
        return releaseMidnightUTCms > todayMidnightUTCms;
      }
    }
  }

  // Fallback: use Date parser, but compare by local-day (treat same-day as released)
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return true;
  if (tzOffsetHours === null) {
    const parsedLocalMid = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return parsedLocalMid.getTime() > today.getTime();
  }

  // If tzOffsetHours provided but parsing used fallback, convert accordingly
  const tzOffMs = Number(tzOffsetHours) * 60 * 60 * 1000;
  const relUtc = Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()) - tzOffMs;
  const shiftedNow = new Date(Date.now() + tzOffMs);
  const targetY2 = shiftedNow.getUTCFullYear();
  const targetM2 = shiftedNow.getUTCMonth();
  const targetD2 = shiftedNow.getUTCDate();
  const todayUtc = Date.UTC(targetY2, targetM2, targetD2) - tzOffMs;
  return relUtc > todayUtc;
}

export function formatFancyDate(dateStr) {
  const UI = (typeof getUI === 'function') ? getUI() : { upcoming: 'Upcoming' };
  if (!dateStr) return UI.upcoming || 'Upcoming';
  // If date is in the future (calendar-day aware), show upcoming label
  if (isFuture(dateStr)) return UI.upcoming || 'Upcoming';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return UI.upcoming || 'Upcoming';
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

// Simple slugify helper used by pages that generate filenames from titles.
export function slugify(s = '') {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-_]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
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
