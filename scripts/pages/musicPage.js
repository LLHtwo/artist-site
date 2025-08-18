import { getAlbums, resolveCover } from '../data/api.js';
import { albumCard } from '../components/albumCard.js';
import { slugify, getUI } from '../core/utils.js';
import { formatFancyDate, capitalize } from '../core/utils.js';

export async function initMusicPage() {
  const heroEl = document.getElementById('featured');
  const gridEl = document.getElementById('discography');
  const modalEl = document.getElementById('album-modal');
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
  // loaded albums count available via albums.length when needed
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
  // preserve explicit service tags if present in the source JSON
  spotify: a.spotify || undefined,
  // accept multiple forms for Apple's service key in source JSON:
  // 'apple', 'apple-music', 'appleMusic', 'apple_music'
  apple: a.apple || a['apple-music'] || a.appleMusic || a['apple_music'] || undefined,
  // canonical appleMusic property for downstream code that prefers that name
  appleMusic: a['apple-music'] || a.appleMusic || a.apple || a['apple_music'] || undefined,
  youtube: a.youtube || undefined,
    // also preserve a nested links object when provided
    links: a.links || undefined,
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
  // ensure this element picks up the muted styling from styles/components/music-page.css
  meta.className = 'featured-section-meta music-featured-meta';
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
  // Build stream buttons (Spotify, Apple Music, YouTube) and replace single Listen button
  const streamWrap = document.createElement('div');
  streamWrap.className = 'stream-buttons';
  const UI = getUI();
  const services = [
    { key: 'spotify', label: UI.spotify || 'Spotify' },
    { key: 'apple-music', label: UI.appleMusic || UI.apple || 'Apple Music' },
    { key: 'youtube', label: UI.youtube || 'YouTube' }
  ];

  const getServiceLink = (albumObj, key) => {
    if (!albumObj || typeof albumObj !== 'object') return undefined;
    if (albumObj[key]) return albumObj[key];
    if (key === 'apple' || key === 'apple-music') {
      if (albumObj.appleMusic) return albumObj.appleMusic;
      if (albumObj['apple_music']) return albumObj['apple_music'];
      if (albumObj['apple-music']) return albumObj['apple-music'];
    }
    const links = albumObj.links;
    if (links && typeof links === 'object') {
      if (links[key]) return links[key];
      if (key === 'apple' || key === 'apple-music') return links.appleMusic || links['apple_music'] || links['apple-music'];
    }
    return undefined;
  };
  // If this is a future release, show a single "Learn more" button that opens the modal
  const isFutureRelease = a && a.releaseDate && (new Date(a.releaseDate).getTime() > Date.now());
  if (isFutureRelease) {
    const learn = document.createElement('button');
    learn.className = 'btn btn-primary stream-btn';
    learn.type = 'button';
    learn.textContent = UI.learnMore || 'Learn more';
    learn.addEventListener('click', () => {
      // openModal is exposed on window by modal.js
      if (typeof window.openModal === 'function') window.openModal(a);
    });
    streamWrap.appendChild(learn);
  } else {
    for (const svc of services) {
      const href = getServiceLink(a, svc.key) || a.link || '#';
      const btn = document.createElement('a');
      btn.className = 'btn stream-btn';
      btn.href = href;
      btn.target = '_blank';
      btn.rel = 'noopener';
      btn.setAttribute('aria-label', svc.label || svc.key);

  const img = document.createElement('img');
  const svgName = (svc.key === 'apple' || svc.key === 'apple-music') ? 'apple-music' : svc.key;
      img.src = `assets/svg/${svgName}.svg`;
      img.alt = svc.label || svc.key;
      img.className = 'social-icon-img';
      btn.appendChild(img);

      btn.appendChild(document.createTextNode(svc.label || svc.key));
      streamWrap.appendChild(btn);
    }
  }
  actions.appendChild(streamWrap);
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
