// Utility: Get average color from an image
function getAverageColor(imgEl, callback) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = imgEl.naturalWidth;
  canvas.height = imgEl.naturalHeight;
  ctx.drawImage(imgEl, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  }
  r = Math.round(r / count);
  g = Math.round(g / count);
  b = Math.round(b / count);
  callback(`rgb(${r},${g},${b})`);
}
// scripts/app.js


// Config

const CONFIG = {
  jsonPath: './assets/albums.json',
  coversDir: './assets/covers',          // put cover images here
  coverCandidates: ['webp', 'jpg', 'png'], // try in this order
  defaultCover: './assets/covers/cover-default.webp', // add a tiny placeholder to assets
};


// Utils

const $ = (sel, root = document) => root.querySelector(sel);

function slugify(str = '') {
  return String(str)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function formatYear(dateStr) {
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? '' : String(d.getFullYear());
}

function isFuture(dateStr) {
  if (!dateStr) return true;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return true;
  return d.getTime() > Date.now();
}

function formatFancyDate(dateStr) {
  if (!dateStr) return 'Upcoming';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'Upcoming';
  if (d.getTime() > Date.now()) return 'Upcoming';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

async function fetchJSON(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} loading ${path}`);
  return res.json();
}

// Try to find a cover by probing extensions in order.
// If the album object already has `cover`, use it as-is.
async function resolveCover(album) {
  if (album.cover) return album.cover;

  const slug = slugify(album.title || 'album');
  for (const ext of CONFIG.coverCandidates) {
    const url = `${CONFIG.coversDir}/${slug}.${ext}`;
    try {
      // HEAD would be ideal, but GitHub Pages often disallows it; do GET with no-cache and bail fast.
      const res = await fetch(url, { method: 'GET', cache: 'no-store' });
      if (res.ok) return url;
    } catch (_) {
      // ignore and try next extension
    }
  }
  return CONFIG.defaultCover;
}


// Rendering

function albumCardHTML(a, { highlight = false } = {}) {
  const isSingle = a.type === 'single';
  const future = isFuture(a.releaseDate);
  const dateDisplay = formatFancyDate(a.releaseDate);
  const badge = isSingle
    ? `<span class="badge badge-single">Single</span>`
    : '';
  const cardClass = [
    'album',
    isSingle ? 'single' : '',
    highlight ? 'highlight' : '',
    future ? 'upcoming' : ''
  ].filter(Boolean).join(' ');

  const linkBtn = a.link
    ? `<a class="btn" href="${a.link}" target="_blank" rel="noopener">Listen</a>`
    : '';
  const spotifyBtn = a.spotify
    ? `<a class="btn" href="${a.spotify}" target="_blank" rel="noopener">Spotify</a>`
    : '';
  const appleBtn = a.apple
    ? `<a class="btn" href="${a.apple}" target="_blank" rel="noopener">Apple</a>`
    : '';

  return `
    <article class="${cardClass}" role="listitem">
      <img class="cover" src="${a.cover}" alt="Cover of ${a.title}" loading="lazy"
           onerror="this.onerror=null;this.src='${CONFIG.defaultCover}';" />
      <div class="meta">
        <div class="title">${a.title} ${badge}</div>
        <div class="year">${dateDisplay}</div>
        <div class="actions">
          ${linkBtn}${spotifyBtn}${appleBtn}
        </div>
      </div>
    </article>
  `;
}


// Main flow

async function loadAndRenderAlbums() {
  const target = $('#albums');
  if (!target) return;

  try {
    const raw = await fetchJSON(CONFIG.jsonPath);

    // Normalize → add year/slug, sort by releaseDate desc, resolve covers
    const normalized = (Array.isArray(raw) ? raw : [])
      .map(item => ({
        ...item,
        title: item.title ?? 'Untitled',
        year: formatYear(item.releaseDate),
        _slug: slugify(item.title ?? 'album'),
        _dateValue: new Date(item.releaseDate || 0).getTime() || 0,
      }))
      .sort((a, b) => b._dateValue - a._dateValue);

    // Resolve cover URLs (concurrently)
    const withCovers = await Promise.all(
      normalized.map(async a => ({ ...a, cover: await resolveCover(a) }))
    );

    // Separate upcoming and released albums
    const upcoming = withCovers.filter(a => isFuture(a.releaseDate));
    const released = withCovers.filter(a => !isFuture(a.releaseDate));

    // Optional limit via data-limit on the grid container
    const limitAttr = target.getAttribute('data-limit');
    const limit = limitAttr ? Math.max(0, parseInt(limitAttr, 10)) : null;
    const finalReleased = limit ? released.slice(0, limit) : released;

    let html = '';
    if (upcoming.length > 0) {
      html += `
        <section class="newest-release" aria-label="Upcoming Releases">
          <h3 class="newest-title">Upcoming Releases</h3>
          ${upcoming.map(a => albumCardHTML(a, { highlight: true })).join('')}
        </section>
      `;
    } else if (released.length > 0) {
      // If no upcoming, show newest released
      html += `
        <section class="newest-release" aria-label="Newest Release">
          <h3 class="newest-title">Newest Release</h3>
          ${albumCardHTML(released[0], { highlight: true })}
        </section>
      `;
      finalReleased.shift(); // Remove the highlighted one from the grid
    }
    html += finalReleased.map(a => albumCardHTML(a)).join('');
    target.innerHTML = html;
  } catch (err) {
    console.error('Failed to load albums:', err);
    // Fallback UI
    target.innerHTML = `
      <div class="muted">Couldn’t load albums right now. Please try again later.</div>
    `;
  }
}

function setCopyrightYear() {
  const el = $('#year');
  if (el) el.textContent = new Date().getFullYear();
}

async function loadFeaturedAlbum() {
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

async function loadLatestReleaseAlbum() {
  const releaseArtEl = document.querySelector('.release-art img');
  const releaseTitleEl = document.getElementById('release-heading');
  const releaseTextEl = document.querySelector('.latest-release p');
  const streamBtns = document.querySelectorAll('.stream-btn');
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
    // Set stream links if available
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


// Init

document.addEventListener('DOMContentLoaded', () => {
  copyrightYear = setCopyrightYear();
  loadAndRenderAlbums();

  // Set hero background to average color of featured album cover
  const featuredImg = document.getElementById('featured-cover');
  const heroSection = document.querySelector('.hero');
  if (featuredImg && heroSection) {
    featuredImg.addEventListener('load', function() {
      getAverageColor(featuredImg, function(avgColor) {
        heroSection.style.background = `linear-gradient(180deg, ${avgColor} 0%, transparent 100%)`;
      });
    });
    // If already loaded (from cache)
    if (featuredImg.complete) {
      getAverageColor(featuredImg, function(avgColor) {
        heroSection.style.background = `linear-gradient(180deg, ${avgColor} 0%, transparent 100%)`;
      });
    }
  }
  loadFeaturedAlbum();
  loadLatestReleaseAlbum();
});
