import { getUI } from '../core/utils.js';
import { isFuture, formatFancyDate } from '../core/utils.js';
import { CONFIG } from '../data/api.js';
import { el } from '../core/dom.js';
import { capitalize } from '../core/utils.js';
import { openModal } from './modal.js';

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
  card.addEventListener('click', () => {
    if (typeof openModal === 'function') {
      openModal(a);
    } else {
      const mod = document.getElementById('album-modal');
      console.warn('[albumCard] openModal not available or modal element missing', { hasModal: !!mod, openModal: typeof openModal });
    }
  });
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      if (typeof openModal === 'function') {
        openModal(a);
      } else {
        const mod = document.getElementById('album-modal');
        console.warn('[albumCard] openModal not available (keydown)', { hasModal: !!mod, openModal: typeof openModal });
      }
    }
  });
  return card;
}
