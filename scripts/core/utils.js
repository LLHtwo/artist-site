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

// getUI depends on DOM; we export a factory that reads from document when first called
let _UI_CACHE = null;
export function getUI() {
  if (_UI_CACHE) return _UI_CACHE;
  const body = document.body || {};
  const listenBtn = document.getElementById('listen-btn');
  const descEl = document.getElementById('release-description');
  _UI_CACHE = {
    listen: (listenBtn && listenBtn.dataset && listenBtn.dataset.label) || body.dataset.listenLabel || 'Listen',
    spotify: body.dataset.spotifyLabel || 'Spotify',
    apple: body.dataset.appleLabel || 'Apple',
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
