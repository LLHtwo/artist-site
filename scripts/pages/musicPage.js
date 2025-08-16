import { getAlbums, resolveCover } from '../data/api.js';
import { albumCard } from '../components/albumCard.js';
import { slugify, getUI } from '../core/utils.js';
import { formatFancyDate, capitalize } from '../core/utils.js';

export async function initMusicPage() {
  const heroEl = document.getElementById('featured');
  const gridEl = document.getElementById('discography');
  const modalEl = document.getElementById('album-modal');
  // Log existence of key elements to help diagnose missing DOM
  console.debug('[music-page] elements:', { featured: !!heroEl, discography: !!gridEl, albumModal: !!modalEl });
  if (!gridEl) {
    console.warn('[music-page] discography element not found; skipping render');
    return;
  }

  try {
    const raw = await getAlbums();
    if (!Array.isArray(raw)) {
      console.error('[music-page] getAlbums did not return an array', raw);
      gridEl.innerHTML = '<p class="muted">Failed to load releases.</p>';
      return;
    }
    const albums = (await Promise.all(raw.map(async a => ({
      ...normalizeAlbum(a),
      cover: await resolveCover(a)
    })))).sort(sortByDateDesc);
    console.debug('[music-page] loaded albums count:', albums.length);
    if (heroEl) renderHero(heroEl, albums);
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
    root.innerHTML = `<p class="muted">${getUI().noFeatured || 'No featured release.'}</p>`;
    return;
  }

  root.textContent = '';
  const section = document.createElement('div');
  section.className = 'featured-section music-featured-section';

  const headerRow = document.createElement('div');
  headerRow.className = 'featured-section-header-row music-featured-header-row';
  const header = document.createElement('span');
  header.className = 'featured-section-header music-featured-header';
  header.textContent = getUI().featuredLabel || 'Featured';
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
  listenBtn.textContent = getUI().listen || 'Listen';
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
