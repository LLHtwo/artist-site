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
      // Update only the leading text node so we don't clobber the separator or the "Learn More" link
      // If a text node already exists as the first child, replace its value; otherwise insert one.
      const firstNode = subtextEl.childNodes && subtextEl.childNodes[0];
      const textValue = type ? `${type} ` : '';
      if (firstNode && firstNode.nodeType === 3) { // TEXT_NODE
        firstNode.nodeValue = textValue;
      } else {
        // prepend a text node so existing elements (sep, link) remain after it
        subtextEl.insertBefore(document.createTextNode(textValue), subtextEl.firstChild);
      }
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
    // Prefer a blurb from notes (latest.note.blurb), then normalized notes, then album.description.
    // If none present, keep or apply the page's existing HTML/text fallback (data-default or current innerHTML).
    const currentHtmlFallback = descEl.innerHTML && descEl.innerHTML.trim() ? descEl.innerHTML : (descEl.getAttribute('data-default') || '');
    let blurb = '';
    if (latest.note && latest.note.blurb) {
      blurb = latest.note.blurb;
    } else if (Array.isArray(latest.notes) && latest.notes.length > 0) {
      // normalized notes may contain strings or {type, text} objects; pick first text-like entry
      const firstText = latest.notes.find(n => typeof n === 'string' || (n && n.type === 'text'));
      if (firstText) blurb = typeof firstText === 'string' ? firstText : firstText.text;
    } else if (latest.description) {
      blurb = latest.description;
    }
    if (blurb) {
      descEl.textContent = blurb;
    } else if (currentHtmlFallback) {
      // keep the existing HTML fallback (or re-apply it)
      descEl.innerHTML = currentHtmlFallback;
    }
    if (badgeEl) {
      badgeEl.innerHTML = latest.type === 'single' ? `<span class="badge badge-single">${getUI().singleLabel || 'Single'}</span>` : '';
    }
    // Populate stream buttons from album data; hide buttons with no corresponding link
    streamBtns.forEach(btn => {
      const label = btn.getAttribute('aria-label');
      let url = '';
      if (label === 'Spotify') url = latest.spotify || latest.spotfy || '';
      if (label === 'Apple Music') url = latest.apple || latest['apple-music'] || latest.appleMusic || '';
      if (label === 'YouTube') url = latest.youtube || latest.yt || '';
      if (url) {
        btn.href = url;
        btn.removeAttribute('hidden');
        btn.removeAttribute('aria-hidden');
      } else {
        // hide gracefully for accessibility
        btn.setAttribute('hidden', '');
        btn.setAttribute('aria-hidden', 'true');
      }
    });
  } catch (err) {
    console.error('Failed to load latest release album:', err);
  }
}

export function renderHero(root, a) {
  // kept for compatibility with prior renderHero that expected albums list; this is a simplified helper
}
