// scripts/albums.js

import { CONFIG } from './config.js';
import { $, slugify, isFuture, formatFancyDate, fetchJSON } from './utils.js';

let albumsCache;
async function getAlbums() {
  if (!albumsCache) {
    const raw = await fetchJSON(CONFIG.jsonPath);
    albumsCache = Array.isArray(raw) ? raw : [];
  }
  return albumsCache;
}

// Determine the appropriate cover image for an album, checking multiple file extensions.
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

// Build markup for a single album card.
function albumCardHTML(a, { highlight = false } = {}) {
  const isSingle = a.type === 'single';
  const future = isFuture(a.releaseDate);
  const dateDisplay = formatFancyDate(a.releaseDate);
  const badge = isSingle ? `<span class="badge badge-single">Single</span>` : '';
  const cardClass = [
    'album',
    isSingle ? 'single' : '',
    highlight ? 'highlight' : '',
    future ? 'upcoming' : ''
  ].filter(Boolean).join(' ');

  const linkBtn = a.link ? `<a class="btn" href="${a.link}" target="_blank" rel="noopener">Listen</a>` : '';
  const spotifyBtn = a.spotify ? `<a class="btn" href="${a.spotify}" target="_blank" rel="noopener">Spotify</a>` : '';
  const appleBtn = a.apple ? `<a class="btn" href="${a.apple}" target="_blank" rel="noopener">Apple</a>` : '';

  return `
    <article class="${cardClass}" role="listitem">
      <img class="cover" src="${a.cover}" alt="Cover of ${a.title}" loading="lazy"
           onerror="this.onerror=null;this.src='${CONFIG.defaultCover}';" />
      <div class="meta">
        <div class="title">${a.title} ${badge}</div>
        <div class="date">${dateDisplay}</div>
        <div class="buttons">
          ${linkBtn}
          ${spotifyBtn}
          ${appleBtn}
        </div>
      </div>
    </article>
  `;
}

// Render the albums listing and newest release section.
export async function loadAndRenderAlbums() {
  const target = $('#albums');
  if (!target) return;
  try {
    const items = await getAlbums();
    const withCovers = await Promise.all(items.map(async a => ({ ...a, cover: await resolveCover(a) })));
    const released = withCovers.filter(a => !isFuture(a.releaseDate));
    const upcoming = withCovers.filter(a => isFuture(a.releaseDate));
    released.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
    const finalReleased = released.slice();
    let html = '';
    if (upcoming.length > 0) {
      html += `
        <section class="newest-release" aria-label="Upcoming Releases">
          <h3 class="newest-title">Upcoming Releases</h3>
          ${upcoming.map(a => albumCardHTML(a, { highlight: true })).join('')}
        </section>
      `;
    } else if (released.length > 0) {
      html += `
        <section class="newest-release" aria-label="Newest Release">
          <h3 class="newest-title">Newest Release</h3>
          ${albumCardHTML(released[0], { highlight: true })}
        </section>
      `;
      finalReleased.shift();
    }
    html += finalReleased.map(a => albumCardHTML(a)).join('');
    target.innerHTML = html;
  } catch (err) {
    console.error('Failed to load albums:', err);
    target.innerHTML = `<div class="muted">Couldn’t load albums right now. Please try again later.</div>`;
  }
}

// Populate the hero section with the featured album.
export async function loadFeaturedAlbum() {
  const coverEl = $('#featured-cover');
  const labelEl = $('#featured-label');
  const titleEl = $('#featured-title');
  const subtextEl = $('#featured-subtext');
  const listenBtn = $('#listen-btn');
  if (!coverEl || !labelEl || !titleEl) return;
  try {
    const items = await getAlbums();
    const featured = items.find(a => a.featured);
    if (!featured) return;
    featured.cover = await resolveCover(featured);
    coverEl.src = featured.cover;
    coverEl.alt = `Cover of ${featured.title}`;
    const upcoming = isFuture(featured.releaseDate);
    labelEl.textContent = upcoming ? 'Upcoming' : 'Latest Release';
    titleEl.textContent = featured.title;
    if (subtextEl) {
      const type = featured.type ? featured.type.charAt(0).toUpperCase() + featured.type.slice(1) : '';
      subtextEl.textContent = type;
    }
    if (listenBtn && featured.link) listenBtn.href = featured.link;
  } catch (err) {
    console.error('Failed to load featured album:', err);
  }
}

// Populate the "latest release" card.
export async function loadLatestReleaseAlbum() {
  const coverEl = document.getElementById('latest-release-cover');
  const titleEl = document.getElementById('release-heading');
  const descEl = document.getElementById('release-description');
  const badgeEl = document.getElementById('latest-badge');
  const streamBtns = document.querySelectorAll('.latest-release-card .stream-btn');
  if (!coverEl || !titleEl || !descEl || streamBtns.length === 0) return;
  try {
    const items = await getAlbums();
    const latest = items.find(a => a.latest);
    if (!latest) return;
    latest.cover = await resolveCover(latest);
    coverEl.src = latest.cover;
    coverEl.alt = `Album cover for ${latest.title}`;
    titleEl.textContent = latest.title ? latest.title : 'Latest Release';
    descEl.textContent = latest.description || 'Check out the newest track from LLH, blending dreamy textures with cinematic vibes.';
    if (badgeEl) {
      badgeEl.innerHTML = latest.type === 'single' ? '<span class="badge badge-single">Single</span>' : '';
    }
    streamBtns.forEach(btn => {
      if (btn.getAttribute('aria-label') === 'Spotify' && latest.spotify) {
        btn.href = latest.spotify;
      } else if (btn.getAttribute('aria-label') === 'Apple Music' && latest.apple) {
        btn.href = latest.apple;
      } else if (btn.getAttribute('aria-label') === 'YouTube' && latest.youtube) {
        btn.href = latest.youtube;
      }
    });
  } catch (err) {
    console.error('Failed to load latest release album:', err);
  }
}

// ------------------------
// Music page: unified render
// ------------------------
export async function renderMusicPage() {
  const mount = $('#albums');
  if (!mount) return;

  try {
    const items = await getAlbums();
    const withCovers = await Promise.all(items.map(async a => ({ ...a, cover: await resolveCover(a) })));

    // Sort newest first for convenience
    const sorted = withCovers.slice().sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));

    // Featured pick: prefer any upcoming; else explicit .featured; else latest released
    const upcoming = sorted.filter(a => isFuture(a.releaseDate));
    const released = sorted.filter(a => !isFuture(a.releaseDate));
    const featuredPick = upcoming[0] || sorted.find(a => a.featured) || released[0] || sorted[0];

    // Build sections
    const featuredHTML = featuredPick ? sectionFeaturedHTML(featuredPick) : '';
    const toolbarHTML = toolbarFiltersHTML();
    const gridHTML = sectionGridHTML(sorted);
    const notesHTML = sectionNotesHTML(sorted);

    mount.innerHTML = `
      ${featuredHTML}
      ${toolbarHTML}
      ${gridHTML}
      ${notesHTML}
    `;

    // Hook up filters
    wireUpFilters();
  } catch (err) {
    console.error('renderMusicPage failed:', err);
    mount.innerHTML = `<div class="muted">Couldn’t load albums right now. Please try again later.</div>`;
  }
}

// ------------------------
// Section templates
// ------------------------
function sectionFeaturedHTML(a) {
  const future = isFuture(a.releaseDate);
  const dateDisplay = formatFancyDate(a.releaseDate);
  const typeLabel = a.type ? a.type.charAt(0).toUpperCase() + a.type.slice(1) : 'Release';

  const spotifyBtn = a.spotify ? `<a class="btn" href="${a.spotify}" target="_blank" rel="noopener">Spotify</a>` : '';
  const appleBtn   = a.apple   ? `<a class="btn" href="${a.apple}"   target="_blank" rel="noopener">Apple</a>`   : '';
  const linkBtn    = a.link    ? `<a class="btn" href="${a.link}"    target="_blank" rel="noopener">Listen</a>`  : '';

  // Uses your existing card styles: .newest-release + .album.highlight
  return `
    <section class="newest-release" aria-label="Featured Release">
      <h3 class="newest-title">${future ? 'Upcoming' : 'Featured'}</h3>
      <article class="album highlight ${future ? 'upcoming' : ''}">
        <img class="cover" src="${a.cover}" alt="Cover of ${a.title}" loading="eager"
             onerror="this.onerror=null;this.src='${CONFIG.defaultCover}';" />
        <div class="meta">
          <div class="title">
            ${a.title}
            ${a.type === 'single' ? '<span class="badge badge-single">Single</span>' : ''}
          </div>
          <div class="year">${typeLabel} • ${dateDisplay}</div>
          <div class="actions">
            ${spotifyBtn}${appleBtn}${linkBtn}
          </div>
        </div>
      </article>
    </section>
  `;
}

function toolbarFiltersHTML() {
  // Uses your chip look & feel from .btn/.chip classes; no extra CSS required
  return `
    <section class="section" aria-label="Discography controls">
      <div class="actions" role="group" aria-label="Filters">
        <button class="btn" data-filter="all" aria-pressed="true">All</button>
        <button class="btn" data-filter="album" aria-pressed="false">Albums</button>
        <button class="btn" data-filter="ep" aria-pressed="false">EPs</button>
        <button class="btn" data-filter="single" aria-pressed="false">Singles</button>
        <button class="btn" data-filter="feature" aria-pressed="false">Features</button>
      </div>
    </section>
  `;
}

function sectionGridHTML(list) {
  // Reuse your grid + card styles (.grid .album etc.)
  const cards = list.map(a => {
    const future = isFuture(a.releaseDate);
    const dateDisplay = formatFancyDate(a.releaseDate);
    const isSingle = a.type === 'single';
    const badge = isSingle ? `<span class="badge badge-single">Single</span>` : '';

    const spotifyBtn = a.spotify ? `<a class="btn" href="${a.spotify}" target="_blank" rel="noopener">Spotify</a>` : '';
    const appleBtn   = a.apple   ? `<a class="btn" href="${a.apple}"   target="_blank" rel="noopener">Apple</a>`   : '';
    const linkBtn    = a.link    ? `<a class="btn" href="${a.link}"    target="_blank" rel="noopener">Listen</a>`  : '';

    return `
      <article class="album ${future ? 'upcoming' : ''}" role="listitem"
               data-type="${a.type || 'album'}" data-year="${(a.releaseDate || '').slice(0,4)}">
        <img class="cover" src="${a.cover}" alt="Cover of ${a.title}" loading="lazy"
             onerror="this.onerror=null;this.src='${CONFIG.defaultCover}';" />
        <div class="meta">
          <div class="title">${a.title} ${badge}</div>
          <div class="year">${dateDisplay}</div>
          <div class="actions">
            ${spotifyBtn}${appleBtn}${linkBtn}
            <a class="btn" href="#note-${slugify(a.title)}">About</a>
          </div>
        </div>
      </article>
    `;
  }).join('');

  return `
    <section class="section" aria-labelledby="discog-heading">
      <h2 id="discog-heading" class="section-title">Discography</h2>
      <div id="discography-grid" class="grid" aria-live="polite">${cards}</div>
    </section>
  `;
}

function sectionNotesHTML(list) {
  const notes = list.map(a => {
    const noteText = a.notes || a.about || a.longDescription || a.description || '';
    const typeLabel = a.type ? a.type.charAt(0).toUpperCase() + a.type.slice(1) : 'Release';
    const dateDisplay = formatFancyDate(a.releaseDate);
    return `
      <details id="note-${slugify(a.title)}" class="album-note">
        <summary>
          <strong>${a.title}</strong>
          <span class="year" style="margin-left:8px; color:var(--muted)">${typeLabel} • ${dateDisplay}</span>
        </summary>
        ${noteText ? `<p style="margin-top:8px">${noteText}</p>` : `<p style="margin-top:8px; color:var(--muted)">No notes yet.</p>`}
      </details>
    `;
  }).join('');

  return `
    <section class="section" aria-labelledby="notes-heading">
      <h2 id="notes-heading" class="section-title">Album notes</h2>
      <div id="album-notes">${notes}</div>
    </section>
  `;
}

// ------------------------
// Filters
// ------------------------
function wireUpFilters() {
  const grid = $('#discography-grid');
  if (!grid) return;
  const buttons = document.querySelectorAll('[data-filter]');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      const f = btn.dataset.filter;
      [...grid.children].forEach(card => {
        const type = (card.getAttribute('data-type') || 'album').toLowerCase();
        card.style.display = (f === 'all' || f === type) ? '' : 'none';
      });
    });
  });
}
