import { getAlbums, resolveCover } from '../data/api.js';
import { albumCardHTML } from '../components/albumCard.js';
import { getUI } from '../core/utils.js';
import { isFuture, formatFancyDate } from '../core/utils.js';

export async function loadAndRenderAlbums() {
  const target = document.getElementById('albums') || document.querySelector('#albums');
  if (!target) return;
  try {
    const items = await getAlbums();
    const withCovers = await Promise.all(items.map(async a => ({ ...a, cover: await resolveCover(a) })));
    const released = withCovers.filter(a => !isFuture(a.releaseDate));
    const upcoming = withCovers.filter(a => isFuture(a.releaseDate));
    released.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
    const finalReleased = released.slice();
    let html = '';
    const UI = getUI();
    if (upcoming.length > 0) {
      html += `\n        <section class="newest-release" aria-label="${UI.upcomingTitle || 'Upcoming Releases'}">\n          <h3 class="newest-title">${UI.upcomingTitle || 'Upcoming Releases'}</h3>\n          ${upcoming.map(a => albumCardHTML(a, { highlight: true })).join('')}\n        </section>\n      `;
    } else if (released.length > 0) {
      html += `\n        <section class="newest-release" aria-label="${UI.newestTitle || 'Newest Release'}">\n          <h3 class="newest-title">${UI.newestTitle || 'Newest Release'}</h3>\n          ${albumCardHTML(released[0], { highlight: true })}\n        </section>\n      `;
      finalReleased.shift();
    }
    html += finalReleased.map(a => albumCardHTML(a)).join('');
    target.innerHTML = html;
  } catch (err) {
    console.error('Failed to load albums:', err);
    const UI = getUI();
    target.innerHTML = `<div class="muted">${UI.loadError}</div>`;
  }
}
