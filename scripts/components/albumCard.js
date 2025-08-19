import { getUI } from '../core/utils.js';
import { isFuture, formatFancyDate } from '../core/utils.js';
import { CONFIG } from '../data/api.js';
import { el } from '../core/dom.js';
import { capitalize } from '../core/utils.js';
// NOTE: do not statically import the modal here. We dynamically import it on demand
// so the modal bundle is only loaded on pages that need it (e.g. music.html).

export function albumCardHTML(a, { highlight = false } = {}) {
  const isSingle = a.type === 'single';
  const future = isFuture(a.releaseDate);
  const dateDisplay = formatFancyDate(a.releaseDate);
  const UI = getUI();
  const badgeText = isSingle ? `<span class="badge badge-single">${UI.singleLabel || 'Single'}</span>` : '';
  const cardClass = [
    'album',
    isSingle ? 'single' : '',
    highlight ? 'highlight' : '',
    future ? 'upcoming' : ''
  ].filter(Boolean).join(' ');

  const linkBtn = a.link ? `<a class="btn" href="${a.link}" target="_blank" rel="noopener">${UI.listen || 'Listen'}</a>` : '';
  const spotifyBtn = a.spotify ? `<a class="btn" href="${a.spotify}" target="_blank" rel="noopener">${UI.spotify || 'Spotify'}</a>` : '';
  const appleBtn = a.apple ? `<a class="btn" href="${a.apple}" target="_blank" rel="noopener">${UI.appleMusic || UI.apple || 'Apple Music'}</a>` : '';

  return `\n    <article class="${cardClass}" role="listitem">\n      <img class="cover" src="${a.cover}" alt="Cover of ${a.title}" loading="lazy"\n           onerror="this.onerror=null;this.src='${CONFIG.defaultCover}';" />\n      <div class="meta">\n        <div class="title">${a.title} ${badgeText}</div>\n        <div class="date">${dateDisplay}</div>\n        <div class="buttons">\n          ${linkBtn}\n          ${spotifyBtn}\n          ${appleBtn}\n        </div>\n      </div>\n    </article>\n  `;
}

export function albumCard(a) {
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
  // helper: find the best external link (used as fallback)
  const getCanonicalLink = (albumObj) => {
    if (!albumObj || typeof albumObj !== 'object') return undefined;
    if (albumObj.link) return albumObj.link;
    if (albumObj.spotify) return albumObj.spotify;
    if (albumObj.appleMusic) return albumObj.appleMusic;
    if (albumObj['apple_music']) return albumObj['apple_music'];
    if (albumObj['apple-music']) return albumObj['apple-music'];
    if (albumObj.youtube) return albumObj.youtube;
    const links = albumObj.links;
    if (links && typeof links === 'object') {
      if (links.spotify) return links.spotify;
      if (links.appleMusic) return links.appleMusic;
      if (links['apple_music']) return links['apple_music'];
      if (links['apple-music']) return links['apple-music'];
      if (links.youtube) return links.youtube;
      const vals = Object.values(links).filter(Boolean);
      if (vals.length) return vals[0];
    }
    return undefined;
  };

  // helper: choose a mobile navigation target — prefer slug-based local page
  const getMobileTarget = (albumObj) => {
    if (!albumObj || typeof albumObj !== 'object') return null;
    if (albumObj.slug) return { href: `${albumObj.slug}.html`, newTab: false };
    if (albumObj.link && typeof albumObj.link === 'string' && albumObj.link.endsWith('.html')) {
      return { href: albumObj.link, newTab: false };
    }
    const fallback = getCanonicalLink(albumObj);
    if (fallback) return { href: fallback, newTab: true };
    return null;
  };

  card.addEventListener('click', (ev) => {
    // If on a small viewport, navigate to the album's fullscreen HTML page
    const isMobile = window.matchMedia('(max-width: 600px)').matches;
    if (isMobile) {
      const target = getMobileTarget(a);
      if (!target) return;
      if (target.newTab) window.open(target.href, '_blank', 'noopener');
      else location.href = target.href;
      return;
    }

    // Otherwise dynamically import and open the modal as before
    (async () => {
      try {
        const modalModule = await import('./modal.js');
        if (modalModule && typeof modalModule.openModal === 'function') {
          modalModule.openModal(a);
          return;
        }
      } catch (err) {
        // fall through to fallback warning below
      }
      const mod = document.getElementById('album-modal');
      console.warn('[albumCard] openModal not available or modal element missing', mod);
    })();
  });

  card.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const isMobile = window.matchMedia('(max-width: 600px)').matches;
      if (isMobile) {
        const href = getCanonicalLink(a) || '#';
        if (href === '#') return;
        window.open(href, '_blank', 'noopener');
        return;
      }
      (async () => {
        try {
          const modalModule = await import('./modal.js');
          if (modalModule && typeof modalModule.openModal === 'function') {
            modalModule.openModal(a);
            return;
          }
        } catch (err) {
          // ignore and warn below
        }
        const mod = document.getElementById('album-modal');
        console.warn('[albumCard] openModal not available (keydown)', mod);
      })();
    }
  });
  return card;
}
