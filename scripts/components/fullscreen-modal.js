import { getUI, capitalize, formatFancyDate, renderInlineMarkdown } from '../core/utils.js';

// Renders a modal-like album feature inline on the page (not as an overlay).
// Returns the root element so callers can insert or remove it.
import { isFuture } from '../core/utils.js';

export function renderFullscreenModal(album, { container = null, allowClose = true } = {}) {
  if (!album) throw new Error('album is required');

  const root = document.createElement('section');
  root.className = 'fullscreen-modal';
  root.setAttribute('aria-labelledby', 'fs-album-title');

  const article = document.createElement('article');
  article.className = 'modal-content modal-content--fullwidth';
  article.setAttribute('role', 'region');

  // close button (optional for inline mode)
  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.setAttribute('aria-label', getUI().close || 'Close');
  closeBtn.textContent = '\u00d7';
  if (allowClose) closeBtn.addEventListener('click', () => root.remove());
  if (allowClose) article.appendChild(closeBtn);

  const header = document.createElement('header');
  header.className = 'modal-header';

  const img = document.createElement('img');
  img.className = 'modal-cover';
  img.src = album.cover || (album.slug ? `assets/covers/${album.slug}.webp` : 'assets/covers/cover-default.webp');
  img.alt = `${album.title} cover`;
  header.appendChild(img);

  const info = document.createElement('div');
  info.className = 'modal-info';

  const title = document.createElement('h2');
  title.id = 'fs-album-title';
  title.className = 'modal-title';
  title.textContent = album.title;
  info.appendChild(title);

  const meta = document.createElement('p');
  meta.className = 'modal-subtitle';
  meta.textContent = `${capitalize(album.type || 'album')}${album.releaseDate ? ' • ' + formatFancyDate(album.releaseDate) : ''}`;
  info.appendChild(meta);

  // optional blurb (either album.note.blurb or first string in album.notes)
  let blurbText = '';
  if (album.note && album.note.blurb) blurbText = album.note.blurb;
  else if (Array.isArray(album.notes) && album.notes.length > 0 && typeof album.notes[0] === 'string') blurbText = album.notes[0];
  const blurbPlaced = Boolean(blurbText);
  if (blurbText) {
    const blurb = document.createElement('p');
    blurb.className = 'modal-lead modal-blurb';
    blurb.innerHTML = renderInlineMarkdown(blurbText);
    info.appendChild(blurb);
  }

  // stream buttons
  const streamRow = document.createElement('div');
  streamRow.className = 'modal-streams';
  const UI = getUI();
  const services = [
    { key: 'spotify', label: UI.spotify || 'Spotify' },
    { key: 'apple-music', label: UI.appleMusic || UI.apple || 'Apple Music' },
    { key: 'youtube', label: UI.youtube || 'YouTube' }
  ];

  const getServiceLink = (albumObj, key) => {
    if (!albumObj || typeof albumObj !== 'object') return undefined;
    if (albumObj[key]) return albumObj[key];
    // apple variants
    if ((key === 'apple' || key === 'apple-music')) {
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

  const isFutureRelease = album && album.releaseDate && isFuture(album.releaseDate);
  if (isFutureRelease) {
    const href = album.link || '#';
    const pre = document.createElement('a');
    pre.className = 'btn btn-primary stream-btn';
    pre.href = href;
    pre.target = '_blank';
    pre.rel = 'noopener';
    pre.setAttribute('aria-label', UI.preSave || 'Pre-save');
    pre.textContent = UI.preSave || 'Pre-save';
    streamRow.appendChild(pre);
  } else {
    for (const svc of services) {
      const href = getServiceLink(album, svc.key) || album.link || '#';
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
      streamRow.appendChild(btn);
    }

    if (album && album.link) {
      const moreBtn = document.createElement('a');
      moreBtn.className = 'btn stream-btn';
      moreBtn.href = album.link;
      moreBtn.target = '_blank';
      moreBtn.rel = 'noopener';
      moreBtn.setAttribute('aria-label', UI.open || UI.more || 'More');
      const globeImg = document.createElement('img');
      globeImg.src = 'assets/svg/globe.svg';
      globeImg.alt = 'More';
      globeImg.className = 'social-icon-img';
      moreBtn.appendChild(globeImg);
      moreBtn.appendChild(document.createTextNode(UI.open || UI.more || 'More'));
      streamRow.appendChild(moreBtn);
    }
  }

  info.appendChild(streamRow);
  header.appendChild(info);
  article.appendChild(header);

  // body: notes / sections
  const body = document.createElement('div');
  body.className = 'modal-body';

  // If album.note exists, use its structure; otherwise render album.notes
  if (album.note && typeof album.note === 'object') {
    // blurb is displayed in the header/info area above the stream buttons; if missing,
    // fall back to the first entry in album.notes for the modal lead. If we already
    // placed the blurb in the header (from album.note.blurb or album.notes[0]) skip it here.
    if (!blurbPlaced && album.notes && album.notes.length > 0) {
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
        const sectTitle = sec['section-title'] || sec.title;
        if (sectTitle) {
          const h = document.createElement('h3');
          h.className = 'modal-section-title';
          h.textContent = sectTitle;
          body.appendChild(h);
        }
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
            // render limited inline markdown from notes
            p.innerHTML = renderInlineMarkdown(bodyHTML);
            body.appendChild(p);
          }
        }
      }
    }
  } else if (Array.isArray(album.notes) && album.notes.length > 0) {
    // skip first note if it was used as blurb
    let start = 0;
    if (blurbText && typeof album.notes[0] === 'string') start = 1;
    for (let i = start; i < album.notes.length; i++) {
      const entry = album.notes[i];
      if (!entry) continue;
      const p = document.createElement('p');
      p.className = 'modal-note';
      if (typeof entry === 'string') p.innerHTML = renderInlineMarkdown(entry);
      else if (entry.body) p.innerHTML = renderInlineMarkdown(entry.body);
      body.appendChild(p);
    }
  }

  article.appendChild(body);
  root.appendChild(article);

  // Insert into container if provided, otherwise return the element for caller to insert
  if (container && container.appendChild) container.appendChild(root);
  return root;
}

// convenience attach for quick usage in inline scripts
window.renderFullscreenModal = renderFullscreenModal;

// On module import, hydrate any placeholders like <section data-fullscreen-album="..."></section>
(async function hydratePlaceholdersOnImport() {
  try {
    const placeholders = Array.from(document.querySelectorAll('[data-fullscreen-album]'));
    if (placeholders.length === 0) return;

    // load album list once
    let albums = [];
    try {
      const res = await fetch('assets/albums.json', { cache: 'no-store' });
      if (res.ok) albums = await res.json();
    } catch (e) {
      console.warn('[fullscreen-modal] failed to load albums.json', e);
    }

    for (const el of placeholders) {
      const albumKey = String(el.getAttribute('data-fullscreen-album') || '').trim();
      if (!albumKey) continue;

      const album = albums.find(a => a && (String(a.slug || '').toLowerCase() === albumKey.toLowerCase() || String(a.title || '').toLowerCase() === albumKey.toLowerCase()));
      if (!album) continue;

        // ensure cover uses slug if available
        if (!album.cover && album.slug) album.cover = `assets/covers/${album.slug}.webp`;

      // attach notes if available
      try {
        const nres = await fetch('assets/notes.json', { cache: 'no-store' });
        if (nres.ok) {
          const notes = await nres.json();
          const note = notes.find(n => n && (n.slug === album.slug || (n.title && String(n.title).toLowerCase().includes(albumKey.toLowerCase()))));
          if (note) album.note = note;
        }
      } catch (e) {
        // ignore
      }

      try {
        const modalEl = renderFullscreenModal(album, { container: null, allowClose: false });
        if (modalEl && el.parentNode) el.parentNode.replaceChild(modalEl, el);
        else if (modalEl && el.appendChild) el.appendChild(modalEl);
      } catch (e) {
        console.warn('[fullscreen-modal] failed to render album for', albumKey, e);
      }
    }
  } catch (e) {
    console.warn('[fullscreen-modal] hydration failed', e);
  }
})();
