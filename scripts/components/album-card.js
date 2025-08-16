import { CONFIG } from '../config.js';
import { isFuture, formatFancyDate } from '../utils.js';

/**
 * Build a DOM element representing a single album card.
 * @param {Object} a - album metadata
 * @param {Object} [opts]
 * @param {boolean} [opts.highlight=false] - apply highlight styles
 * @param {boolean} [opts.upcoming] - override upcoming status; defaults to release date check
 * @returns {HTMLElement}
 */
export function albumCard(a, { highlight = false, upcoming } = {}) {
  const isSingle = a.type === 'single';
  const isUpcoming = upcoming ?? isFuture(a.releaseDate);
  const dateDisplay = formatFancyDate(a.releaseDate);
  const badgeHTML = isSingle ? '<span class="badge badge-single">Single</span>' : '';

  const card = document.createElement('article');
  card.className = [
    'album',
    isSingle ? 'single' : '',
    highlight ? 'highlight' : '',
    isUpcoming ? 'upcoming' : ''
  ].filter(Boolean).join(' ');
  card.setAttribute('role', 'listitem');

  card.innerHTML = `
    <img class="cover" src="${a.cover}" alt="Cover of ${a.title}" loading="lazy"
         onerror="this.onerror=null;this.src='${CONFIG.defaultCover}';" />
    <div class="meta">
      <div class="title">${a.title} ${badgeHTML}</div>
      <div class="date">${dateDisplay}</div>
      <div class="buttons">
        ${a.link ? `<a class="btn" href="${a.link}" target="_blank" rel="noopener">Listen</a>` : ''}
        ${a.spotify ? `<a class="btn" href="${a.spotify}" target="_blank" rel="noopener">Spotify</a>` : ''}
        ${a.apple ? `<a class="btn" href="${a.apple}" target="_blank" rel="noopener">Apple</a>` : ''}
      </div>
    </div>
  `;

  return card;
}

