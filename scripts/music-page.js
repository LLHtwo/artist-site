// scripts/music-page.js
// Page-specific renderer for music.html. Keeps global nav/footer intact.
// HTML structure expected (already in music.html):
//  - #featured (Featured / Upcoming)
//  - #discography (Grid)
//  - #notes (Separate Notes section with long-form stories)
//
// notes.json schema (flexible):
// [
//   {
//     "slug": "born-for-more",             // must match album slug (auto from title if none in albums.json)
//     "title": "Born For More — Story & Process",
//     "updatedAt": "2025-08-14",
//     "quote": "We recorded the hook at 2am with the city humming outside.",
//     "body": "Plain text with blank lines = paragraphs.\n\nOr provide HTML.",
//     "sections": [
//       {"title": "Writing", "body": "text/html here"},
//       {"title": "Production", "body": "text/html here"}
//     ],
//     "media": [
//       {"type": "image", "src": "assets/notes/bfm-session.jpg", "alt": "Session"},
//       {"type": "audio", "src": "assets/notes/bfm-demo.mp3"}
//     ]
//   }
// ]

(function(){
  const ALBUMS_URL = 'assets/albums.json';
  const NOTES_URL  = 'assets/notes.json';

  document.addEventListener('DOMContentLoaded', initMusicPage);

  async function initMusicPage(){
    const featuredEl = document.querySelector('#featured');
    const discogEl   = document.querySelector('#discography');
    const notesEl    = document.querySelector('#notes');
    if (!featuredEl || !discogEl || !notesEl) return;

    try {
      const [albums, notes] = await Promise.all([
        fetchJSON(ALBUMS_URL),
        fetchJSON(NOTES_URL).catch(() => ([])) // tolerate missing notes.json during dev
      ]);

      const normAlbums = (albums || []).map(normalizeAlbum).sort(sortByDateDesc);
      const notesIndex = indexNotes(notes || []);

      renderFeatured(featuredEl, normAlbums);
      renderDiscography(discogEl, normAlbums, notesIndex);
      renderNotes(notesEl, normAlbums, notesIndex);

    } catch (err){
      console.error('[music-page] init failed', err);
      showError(err);
    }
  }

  // -------------------- Data helpers --------------------
  async function fetchJSON(url){
    const res = await fetch(url, { credentials: 'omit' });
    if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
    return res.json();
  }

  function normalizeAlbum(a){
    const date = a.releaseDate ? new Date(a.releaseDate) : null;
    const slug = a.slug || slugify(a.title);
    const type = (a.type || 'album').toLowerCase();
    return {
      title: a.title,
      type,
      link: a.link || '#',
      releaseDate: a.releaseDate || null,
      date,
      year: date ? String(date.getFullYear()) : '',
      featured: !!a.featured,
      upcoming: date ? date > new Date() : false,
      slug,
      cover: a.cover || `assets/covers/${slug}.webp`,
      ...a
    };
  }

  function sortByDateDesc(a,b){
    const at = a.date ? a.date.getTime() : 0;
    const bt = b.date ? b.date.getTime() : 0;
    return bt - at;
  }

  function indexNotes(notesArray){
    const idx = new Map();
    if (Array.isArray(notesArray)){
      for (const n of notesArray){
        const slug = n.slug || slugify(n.title || '');
        if (!slug) continue;
        idx.set(slug, {
          slug,
          title: n.title || null,
          body: n.body || '',
          updatedAt: n.updatedAt || null,
          sections: Array.isArray(n.sections) ? n.sections : null,
          quote: n.quote || null,
          media: Array.isArray(n.media) ? n.media : null
        });
      }
    } else if (notesArray && typeof notesArray === 'object'){
      for (const [slug, n] of Object.entries(notesArray)){
        idx.set(slug, {
          slug,
          title: n.title || null,
          body: n.body || '',
          updatedAt: n.updatedAt || null,
          sections: Array.isArray(n.sections) ? n.sections : null,
          quote: n.quote || null,
          media: Array.isArray(n.media) ? n.media : null
        });
      }
    }
    return idx;
  }

  function slugify(str){
    return String(str || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // -------------------- Rendering --------------------
  function renderFeatured(root, albums){
    // Show explicit featured first; else show upcoming (future-dated albums)
    const featured = albums.filter(a => a.featured);
    const upcoming = albums.filter(a => a.upcoming && a.type === 'album');
    const items = featured.length ? featured : upcoming;

    root.innerHTML = '';
    if (!items.length){
      root.innerHTML = '<p class="muted">No featured or upcoming releases right now.</p>';
      return;
    }

    for (const a of items){
      root.appendChild(albumCard(a, { highlight: true, showType: true }));
    }
  }

  function renderDiscography(root, albums, notesIndex){
    root.innerHTML = '';

    for (const a of albums){
      const hasNotes = notesIndex.has(a.slug);
      const card = albumCard(a, { showType: true, showYear: true, hasNotes });

      if (hasNotes){
        // Minimal “Notes” link (no excerpt/teaser)
        const notesLink = el('a', {
          class: 'btn',
          href: `#note-${a.slug}`,
          'aria-label': `Read notes for ${a.title}`
        }, 'Notes');
        card.querySelector('.actions')?.appendChild(notesLink);
      }

      root.appendChild(card);
    }
  }

  function renderNotes(root, albums, notesIndex){
    root.innerHTML = '';

    // Only render notes that exist, in the same order as albums (newest->oldest)
    const withNotes = albums.filter(a => notesIndex.has(a.slug));
    if (!withNotes.length){
      root.innerHTML = '<p class="muted">No notes available yet.</p>';
      return;
    }

    for (const a of withNotes){
      const n = notesIndex.get(a.slug);
      const id = `note-${a.slug}`;

      const article = el('article', { class: 'note', id });

      // Title (+ compact meta)
      const h = el('h3', { class: 'note-title' });
      const metaBits = [];
      if (a.year) metaBits.push(a.year);
      if (a.type) metaBits.push(capitalize(a.type));
      const meta = metaBits.length ? ` (${metaBits.join(' · ')})` : '';
      h.textContent = `${n.title || a.title}${meta}`;
      article.appendChild(h);

      // Optional pull-quote
      if (n.quote){
        article.appendChild(el('div', { class: 'note-quote' }, n.quote));
      }

      // Body (plain text → paragraphs; HTML passes through)
      const body = el('div', { class: 'note-body' });
      body.innerHTML = asHTML(n.body);
      article.appendChild(body);

      // Sections
      if (n.sections){
        for (const sec of n.sections){
          const secWrap = el('section', { class: 'note-section' });
          if (sec.title) secWrap.appendChild(el('h4', { class: 'note-section-title' }, sec.title));
          const secBody = el('div');
          secBody.innerHTML = asHTML(sec.body || '');
          secWrap.appendChild(secBody);
          article.appendChild(secWrap);
        }
      }

      // Media
      if (n.media && n.media.length){
        const mediaWrap = el('div', { class: 'note-media' });
        for (const m of n.media){
          if (m.type === 'image'){
            const fig = el('figure');
            const img = el('img', { src: m.src, alt: m.alt || '' });
            fig.appendChild(img);
            if (m.caption) fig.appendChild(el('figcaption', {}, m.caption));
            mediaWrap.appendChild(fig);
          } else if (m.type === 'audio'){
            mediaWrap.appendChild(el('audio', { controls: true, src: m.src }));
          } else if (m.type === 'video'){
            mediaWrap.appendChild(el('video', { controls: true, src: m.src }));
          }
        }
        article.appendChild(mediaWrap);
      }

      // Back link to discography heading (if present in your HTML)
      article.appendChild(el('div', { class: 'note-back' }));
      article.lastChild.innerHTML = '<a href="#discog-heading">↥ Back to discography</a>';

      root.appendChild(article);
    }
  }

  function albumCard(a, opts={}){
    const { highlight=false, showType=false, showYear=false } = opts;
    const card = el('div', { class: `album${highlight ? ' highlight' : ''}` });

    // Cover
    const coverWrap = el('div', { class: 'cover' });
    const coverImg = el('img', { class: 'cover', alt: `${a.title} cover`, src: a.cover });
    coverWrap.innerHTML = '';
    coverWrap.appendChild(coverImg);

    // Meta
    const meta = el('div', { class: 'meta' });

    // Title row with optional 'Single' badge inline
    const titleRow = el('div', { style: 'display:flex;align-items:center;gap:8px;' });
    const title = el('div', { class: 'title' }, a.title);
    titleRow.appendChild(title);
    if (a.type === 'single') {
      titleRow.appendChild(badge('Single', 'badge-single'));
    }

    const sub = el('div', { class: 'year' });
    sub.textContent = [ showYear ? a.year : null, showType ? capitalize(a.type) : null ]
      .filter(Boolean)
      .join(' • ');

    const actions = el('div', { class: 'actions' });
    const listen = el('a', { class: 'btn', href: a.link || '#', target: '_blank', rel: 'noopener' }, 'Listen');
    actions.appendChild(listen);

    meta.append(titleRow, sub, actions);
    card.append(coverWrap, meta);
    return card;
  }

  function badge(text, extraClass=''){
    return el('span', { class: `badge ${extraClass}`.trim(), 'aria-label': text }, text);
  }

  // -------------------- Small utils --------------------
  function el(tag, attrs={}, text){
    const node = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs || {})){
      if (v == null) continue;
      if (k === 'class') node.className = v;
      else if (k === 'style') node.setAttribute('style', v);
      else node.setAttribute(k, v);
    }
    if (text != null) node.textContent = text;
    return node;
  }

  function capitalize(s){
    s = String(s || '');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function asHTML(input){
    const str = String(input || '').trim();
    if (!str) return '';
    const looksHTML = /<\w+[\s\S]*>/m.test(str);
    if (looksHTML) return str;
    return str
      .split(/\n\n+/)
      .map(para => `<p>${escapeHTML(para).replace(/\n/g, '<br>')}</p>`)
      .join('\n');
  }

  function escapeHTML(s){
    return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  }

  function showError(err){
    const cont = document.querySelector('#discography');
    if (cont){
      cont.innerHTML = `<p class="muted">Failed to load releases. ${escapeHTML(err.message || String(err))}</p>`;
    }
  }
})();

// --- Stories / Notes ---
async function renderStories({ albums }) {
  const notesEl = document.getElementById('notes');
  if (!notesEl) return;

  // Load notes
  const res = await fetch('assets/notes.json', { credentials: 'omit' });
  const notes = await res.json();

  // Map albums by title for grouping (or switch to albumSlug if you prefer)
  const albumOrder = new Map(albums.map((a, i) => [a.title, i]));

  // Group notes by album
  const byAlbum = notes.reduce((acc, n) => {
    const key = n.album || 'Other';
    (acc[key] ||= []).push(n);
    return acc;
  }, {});

  // Sort albums by their order from albums.json (fallback: alphabetic)
  const albumKeys = Object.keys(byAlbum).sort((a, b) => {
    const ai = albumOrder.has(a) ? albumOrder.get(a) : Infinity;
    const bi = albumOrder.has(b) ? albumOrder.get(b) : Infinity;
    return ai - bi || a.localeCompare(b);
  });

  // Render
  const frag = document.createDocumentFragment();

  for (const albumTitle of albumKeys) {
    const h = document.createElement('h3');
    h.className = 'album-group';
    h.textContent = albumTitle;
    frag.appendChild(h);

    const wrap = document.createElement('div');
    wrap.className = 'album-stories';

    // newest first
    const stories = byAlbum[albumTitle].slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

    for (const s of stories) {
      const id = `story-${s.slug}`;
      const excerpt = s.excerpt || (s.bodyHtml ? s.bodyHtml.replace(/<[^>]+>/g, '').trim().slice(0, 180) + '…' : '');

      const article = document.createElement('article');
      article.className = 'story';
      article.id = id;

      article.innerHTML = `
        <details>
          <summary>
            <span class="story-title">${escapeHtml(s.title)}</span>
            <span class="story-meta">${formatDate(s.updatedAt)} · ${escapeHtml(albumTitle)}</span>
            <span class="story-excerpt">${escapeHtml(excerpt)}</span>
            <span class="chevron" aria-hidden="true">▾</span>
          </summary>
          <div class="story-body">${s.bodyHtml || ''}</div>
        </details>
      `;
      wrap.appendChild(article);
    }

    frag.appendChild(wrap);
  }

  notesEl.replaceChildren(frag);

  // Deep-link: auto-open matching story if #hash present
  const hash = decodeURIComponent(location.hash || '').replace(/^#/, '');
  if (hash) {
    const target = document.getElementById(hash) || document.getElementById(`story-${hash}`);
    if (target) {
      const det = target.querySelector('details');
      if (det) det.open = true;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Helpers
  function formatDate(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso + 'T00:00:00Z');
      return d.toISOString().slice(0, 10); // YYYY-MM-DD
    } catch { return iso; }
  }

  function escapeHtml(str = '') {
    return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
}

