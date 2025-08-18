import { getAlbums, resolveCover } from '../data/api.js';
import { getUI, capitalize } from '../core/utils.js';

export async function loadFeaturedAlbum() {
  const coverEl = document.getElementById('featured-cover');
  const labelEl = document.getElementById('featured-label');
  const titleEl = document.getElementById('featured-title');
  const subtextEl = document.getElementById('featured-subtext');
  // require only the minimal elements; other nodes are optional across pages
  if (!coverEl || !titleEl) return;
  try {
    const items = await getAlbums();
    const featured = items.find(a => a.featured);
    if (!featured) return;
    featured.cover = await resolveCover(featured);
    coverEl.src = featured.cover;
    coverEl.alt = `Cover of ${featured.title}`;
    const upcoming = (new Date(featured.releaseDate)).getTime() > Date.now();
    if (labelEl) labelEl.textContent = upcoming ? (getUI().upcoming || 'Upcoming') : (getUI().latestRelease || 'Latest Release');
    titleEl.textContent = featured.title;
    if (subtextEl) {
      const type = featured.type ? featured.type.charAt(0).toUpperCase() + featured.type.slice(1) : '';
      subtextEl.textContent = type;
    }
  // listen button is page-specific; do not assume presence of a global element here.
  } catch (err) {
    console.error('Failed to load featured album:', err);
  }
}

export async function loadLatestReleaseAlbum() {
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
    titleEl.textContent = latest.title ? latest.title : (getUI().latestRelease || 'Latest Release');
    descEl.textContent = latest.description || (getUI().loadError || 'An addictive, loop-driven house track — hypnotic energy built for summer nights.');
    if (badgeEl) {
      badgeEl.innerHTML = latest.type === 'single' ? `<span class="badge badge-single">${getUI().singleLabel || 'Single'}</span>` : '';
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

export function renderHero(root, a) {
  // kept for compatibility with prior renderHero that expected albums list; this is a simplified helper
}
