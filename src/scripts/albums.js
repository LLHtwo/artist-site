// scripts/albums.js

import { CONFIG } from './config.js';
import { $, slugify, isFuture, formatFancyDate, fetchJSON } from './utils.js';

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

export async function loadAndRenderAlbums() {
  const target = $('#albums');
  if (!target) return;
  try {
    const raw = await fetchJSON(CONFIG.jsonPath);
    const items = Array.isArray(raw) ? raw : [];
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

export async function loadFeaturedAlbum() {
  const coverEl = $('#featured-cover');
  const labelEl = $('#featured-label');
  const titleEl = $('#featured-title');
  const subtextEl = $('#featured-subtext');
  const listenBtn = $('#listen-btn');
  if (!coverEl || !labelEl || !titleEl) return;
  try {
    const raw = await fetchJSON(CONFIG.jsonPath);
    const items = Array.isArray(raw) ? raw : [];
    const featured = items.find(a => a.featured);
    if (!featured) return;
    featured.cover = await resolveCover(featured);
    coverEl.src = featured.cover;
    coverEl.alt = `Cover of ${featured.title}`;
    const upcoming = isFuture(featured.releaseDate);
    labelEl.textContent = upcoming ? 'Upcoming' : 'Latest Release';
    titleEl.textContent = `“${featured.title}”`;
    if (subtextEl) {
      const type = featured.type ? featured.type.charAt(0).toUpperCase() + featured.type.slice(1) : '';
      subtextEl.textContent = type;
    }
    if (listenBtn && featured.link) listenBtn.href = featured.link;
  } catch (err) {
    console.error('Failed to load featured album:', err);
  }
}

export async function loadLatestReleaseAlbum() {
  const releaseArtEl = document.querySelector('.release-art img');
  const releaseTitleEl = document.getElementById('release-heading');
  const releaseTextEl = document.querySelector('.latest-release p');
  const streamBtns = document.querySelectorAll('.stream-btn');
  const badgeEl = document.getElementById('latest-badge');
  if (!releaseArtEl || !releaseTitleEl || !releaseTextEl || streamBtns.length === 0) return;
  try {
    const raw = await fetchJSON(CONFIG.jsonPath);
    const items = Array.isArray(raw) ? raw : [];
    const latest = items.find(a => a.latest);
    if (!latest) return;
    latest.cover = await resolveCover(latest);
    releaseArtEl.src = latest.cover;
    releaseArtEl.alt = `Album cover for ${latest.title}`;
    releaseTitleEl.textContent = latest.title ? latest.title : 'Latest Release';
    releaseTextEl.textContent = latest.description || 'Check out the newest track from LLH, blending dreamy textures with cinematic vibes.';
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

