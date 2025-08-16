// scripts/all.js
// Single-file bundle combining utils.js, config.js, albums-service.js,
// home-page.js, music-page.js and main.js for simpler deployment.

// ---------------------- utils.js ----------------------
const $ = (sel, root = document) => root.querySelector(sel);

function slugify(str = '') {
  return String(str)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
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

function setCopyrightYear() {
  const el = $('#year');
  if (el) el.textContent = new Date().getFullYear();
}

function capitalize(s = '') {
  s = String(s);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function escapeHTML(str = '') {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

// ---------------------- config.js ----------------------
const CONFIG = {
  jsonPath: 'assets/albums.json',
  notesPath: 'assets/notes.json',
  coversDir: 'assets/covers',
  coverCandidates: ['webp', 'jpg', 'png'],
  defaultCover: 'assets/covers/cover-default.webp',
};

// ---------------------- albums-service.js ----------------------
let albumsCache;
async function getAlbums() {
  if (!albumsCache) {
    const raw = await fetchJSON(CONFIG.jsonPath);
    const notesRaw = await (async () => {
      try {
        const n = await fetchJSON(CONFIG.notesPath);
        return Array.isArray(n) ? n : [];
      } catch (e) {
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
    });
  }
  return albumsCache;
}

function normalizeNotes(n) {
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

function stripHTML(input = '') {
  return String(input).replace(/<[^>]*>/g, '');
}

async function resolveCover(album) {
  if (album.cover) return album.cover;
  const slug = slugify(album.title || 'album');
  for (const ext of CONFIG.coverCandidates) {
    const url = `${CONFIG.coversDir}/${slug}.${ext}`;
    try {
      const res = await fetch(url, { method: 'GET', cache: 'no-store' });
      if (res.ok) return url;
    } catch (_) {}
  }
  return CONFIG.defaultCover;
}

// ---------------------- home-page.js ----------------------
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

  return `\n    <article class="${cardClass}" role="listitem">\n      <img class="cover" src="${a.cover}" alt="Cover of ${a.title}" loading="lazy"\n           onerror="this.onerror=null;this.src='${CONFIG.defaultCover}';" />\n      <div class="meta">\n        <div class="title">${a.title} ${badge}</div>\n        <div class="date">${dateDisplay}</div>\n        <div class="buttons">\n          ${linkBtn}\n          ${spotifyBtn}\n          ${appleBtn}\n        </div>\n      </div>\n    </article>\n  `;
}

async function loadAndRenderAlbums() {
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
      html += `\n        <section class="newest-release" aria-label="Upcoming Releases">\n          <h3 class="newest-title">Upcoming Releases</h3>\n          ${upcoming.map(a => albumCardHTML(a, { highlight: true })).join('')}\n        </section>\n      `;
    } else if (released.length > 0) {
      html += `\n        <section class="newest-release" aria-label="Newest Release">\n          <h3 class="newest-title">Newest Release</h3>\n          ${albumCardHTML(released[0], { highlight: true })}\n        </section>\n      `;
      finalReleased.shift();
    }
    html += finalReleased.map(a => albumCardHTML(a)).join('');
    target.innerHTML = html;
  } catch (err) {
    console.error('Failed to load albums:', err);
    target.innerHTML = `<div class="muted">Couldn\u2019t load albums right now. Please try again later.</div>`;
  }
}

async function loadFeaturedAlbum() {
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

async function loadLatestReleaseAlbum() {
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

// ---------------------- music-page.js ----------------------
document.addEventListener('DOMContentLoaded', initMusicPage);

async function initMusicPage() {
  const heroEl = document.getElementById('featured');
  const gridEl = document.getElementById('discography');
  const modalEl = document.getElementById('album-modal');
  if (!heroEl || !gridEl || !modalEl) return;

  try {
    const raw = await getAlbums();
    const albums = (await Promise.all(raw.map(async a => ({
      ...normalizeAlbum(a),
      cover: await resolveCover(a)
    })))).sort(sortByDateDesc);
    renderHero(heroEl, albums);
    renderDiscography(gridEl, albums);
  } catch (err) {
    console.error('[music-page] init failed', err);
    gridEl.innerHTML = '<p class="muted">Failed to load releases.</p>';
  }
}

function normalizeAlbum(a) {
  const slug = a.slug || slugify(a.title);
  return {
    title: a.title,
    type: (a.type || 'album').toLowerCase(),
    releaseDate: a.releaseDate || '',
    link: a.link || '#',
    notes: Array.isArray(a.notes) ? a.notes : [],
    cover: a.cover || `assets/covers/${slug}.webp`,
    featured: !!a.featured,
    slug
  };
}

function sortByDateDesc(a, b) {
  return (b.releaseDate || '').localeCompare(a.releaseDate || '');
}

function renderHero(root, albums) {
  const a = albums.find(x => x.featured) || albums[0];
  if (!a) {
    root.innerHTML = '<p class="muted">No featured release.</p>';
    return;
  }

  root.textContent = '';
  const section = document.createElement('div');
  section.className = 'featured-section music-featured-section';

  const headerRow = document.createElement('div');
  headerRow.className = 'featured-section-header-row music-featured-header-row';
  const header = document.createElement('span');
  header.className = 'featured-section-header music-featured-header';
  header.textContent = 'Featured';
  headerRow.appendChild(header);
  section.appendChild(headerRow);

  const content = document.createElement('div');
  content.className = 'featured-section-content music-featured-content';

  const art = document.createElement('div');
  art.className = 'featured-section-art music-featured-art';
  const img = document.createElement('img');
  img.src = a.cover;
  img.alt = `${a.title} cover`;
  art.appendChild(img);
  content.appendChild(art);

  const info = document.createElement('div');
  info.className = 'featured-section-info music-featured-info';
  const title = document.createElement('h2');
  title.className = 'featured-section-title music-featured-title';
  title.textContent = a.title;
  info.appendChild(title);
  const meta = document.createElement('p');
  meta.textContent = `${capitalize(a.type)}${a.releaseDate ? ' • ' + formatFancyDate(a.releaseDate) : ''}`;
  info.appendChild(meta);
  // Render first available note text as tagline (support strings and structured notes)
  const firstNote = (a.notes || []).find(n => n != null);
  if (firstNote) {
    const tagline = document.createElement('p');
    tagline.className = 'featured-section-tagline music-featured-tagline';
    tagline.textContent = (typeof firstNote === 'string') ? firstNote : (firstNote.text || '');
    info.appendChild(tagline);
  }
  const actions = document.createElement('div');
  actions.className = 'featured-section-actions music-featured-actions';
  const listenBtn = document.createElement('a');
  listenBtn.className = 'btn btn-primary listen-btn music-listen-btn';
  listenBtn.href = a.link;
  listenBtn.target = '_blank';
  listenBtn.rel = 'noopener';
  listenBtn.textContent = 'Listen';
  actions.appendChild(listenBtn);
  info.appendChild(actions);
  content.appendChild(info);
  section.appendChild(content);
  root.appendChild(section);
}

function renderDiscography(root, albums) {
  root.textContent = '';
  for (const a of albums) {
    const card = albumCard(a);
    root.appendChild(card);
  }
}

function albumCard(a) {
  const card = el('article', { class: 'album-card', tabindex: '0' });
  const img = document.createElement('img');
  img.className = 'album-cover';
  img.src = a.cover;
  img.alt = `${a.title} cover`;
  card.appendChild(img);
  const title = document.createElement('h3');
  title.className = 'album-title';
  title.textContent = a.title;
  card.appendChild(title);
  const meta = document.createElement('p');
  meta.className = 'album-meta';
  meta.textContent = `${capitalize(a.type)}${a.releaseDate ? ' • ' + formatFancyDate(a.releaseDate) : ''}`;
  card.appendChild(meta);
  card.addEventListener('click', () => openModal(a));
  card.addEventListener('keydown', e => { if (e.key === 'Enter') openModal(a); });
  return card;
}

function openModal(album) {
  const modal = document.getElementById('album-modal');
  modal.textContent = '';
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  const article = document.createElement('article');
  article.className = 'modal-content modal-content--large';
  article.setAttribute('role', 'dialog');
  article.setAttribute('aria-modal', 'true');
  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.textContent = '\u00d7';
  const header = document.createElement('header');
  header.className = 'modal-header';
  const img = document.createElement('img');
  img.className = 'modal-cover';
  img.src = album.cover;
  img.alt = `${album.title} cover`;
  header.appendChild(img);
  const info = document.createElement('div');
  info.className = 'modal-info';
  const title = document.createElement('h2');
  title.textContent = album.title;
  title.className = 'modal-title';
  info.appendChild(title);
  const meta = document.createElement('p');
  meta.textContent = `${capitalize(album.type)}${album.releaseDate ? ' • ' + formatFancyDate(album.releaseDate) : ''}`;
  info.appendChild(meta);
  const streamRow = document.createElement('div');
  streamRow.className = 'modal-streams';
  if (album.links && typeof album.links === 'object') {
    for (const [k, v] of Object.entries(album.links)) {
      const btn = document.createElement('a');
      btn.className = 'btn btn-primary';
      btn.href = v;
      btn.target = '_blank';
      btn.rel = 'noopener';
      btn.textContent = capitalize(k);
      streamRow.appendChild(btn);
    }
  } else {
    const services = ['Spotify', 'Apple', 'YouTube'];
    for (const svc of services) {
      const btn = document.createElement('a');
      btn.className = 'btn btn-primary';
      btn.href = album.link || '#';
      btn.target = '_blank';
      btn.rel = 'noopener';
      btn.textContent = svc;
      streamRow.appendChild(btn);
    }
  }
  info.appendChild(streamRow);
  header.appendChild(info);
  article.appendChild(closeBtn);
  article.appendChild(header);
  const body = document.createElement('div');
  body.className = 'modal-body';
  if (album.note) {
    if (album.note.title) {
      const noteTitleEl = document.createElement('h3');
      noteTitleEl.className = 'modal-note-title modal-section-title';
      noteTitleEl.textContent = album.note.title;
      body.appendChild(noteTitleEl);
    }
    if (album.note.blurb) {
      const lead = document.createElement('p');
      lead.className = 'modal-lead';
      lead.textContent = album.note.blurb;
      body.appendChild(lead);
    } else if (album.notes && album.notes.length > 0) {
      const firstNote = album.notes.find(n => n != null);
      if (firstNote) {
        const lead = document.createElement('p');
        lead.className = 'modal-lead';
        lead.textContent = (typeof firstNote === 'string') ? firstNote : (firstNote.text || '');
        body.appendChild(lead);
      }
    }
    if (album.note.sections && Array.isArray(album.note.sections)) {
      for (const sec of album.note.sections) {
        // Render section title as header if present
        if (sec.title) {
          const h = document.createElement('h3');
          h.className = 'modal-section-title';
          h.textContent = sec.title;
          body.appendChild(h);
        }
        // Render section body as a separate paragraph/block if present
        if (sec.body) {
          let bodyHTML = sec.body;
          if (album.note.blurb) {
            const blurbTrim = album.note.blurb.trim();
            if (blurbTrim && bodyHTML.trim().startsWith(blurbTrim)) {
              bodyHTML = bodyHTML.replace(blurbTrim, '').trim();
            }
          }
          if (bodyHTML) {
            const p = document.createElement('p');
            p.innerHTML = bodyHTML;
            body.appendChild(p);
          }
        }
      }
    }
    if (album.note.media && Array.isArray(album.note.media)) {
      const mediaWrap = document.createElement('div');
      mediaWrap.className = 'modal-media';
      for (const m of album.note.media) {
        if (m.type === 'image') {
          const im = document.createElement('img');
          im.src = m.src;
          im.alt = m.alt || '';
          im.className = 'modal-media-image';
          mediaWrap.appendChild(im);
        } else if (m.type === 'audio') {
          const audio = document.createElement('audio');
          audio.controls = true;
          const src = document.createElement('source');
          src.src = m.src;
          audio.appendChild(src);
          mediaWrap.appendChild(audio);
        }
      }
      body.appendChild(mediaWrap);
    }
  } else {
    album.notes.forEach(entry => {
      if (typeof entry === 'string') {
        const note = document.createElement('p');
        note.textContent = entry;
        body.appendChild(note);
      } else if (entry && typeof entry === 'object') {
        if (entry.type === 'title') {
          const h = document.createElement('h3');
          h.className = 'modal-section-title';
          h.textContent = entry.text;
          body.appendChild(h);
        } else if (entry.type === 'text') {
          const p = document.createElement('p');
          p.textContent = entry.text;
          body.appendChild(p);
        }
      }
    });
  }
  article.appendChild(body);
  modal.appendChild(backdrop);
  modal.appendChild(article);
  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  const focusables = article.querySelectorAll('a, button');
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  function trap(e) {
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    } else if (e.key === 'Escape') { close(); }
  }
  function close() {
    modal.classList.add('hidden');
    modal.textContent = '';
    document.body.classList.remove('modal-open');
    document.removeEventListener('keydown', trap);
  }
  document.addEventListener('keydown', trap);
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  first && first.focus();
}

function el(tag, attrs) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  return node;
}

// ---------------------- main.js ----------------------
document.addEventListener('DOMContentLoaded', () => {
  setCopyrightYear();
  const isMusicPage = document.body.classList.contains('music-page');
  if (!isMusicPage) {
    loadAndRenderAlbums();
  }
  loadFeaturedAlbum();
  loadLatestReleaseAlbum();
});
