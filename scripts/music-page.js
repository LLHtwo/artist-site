// scripts/music-page.js

import { getAlbums, resolveCover } from './albums-service.js';
import { slugify, escapeHTML, capitalize } from './utils.js';

document.addEventListener('DOMContentLoaded', init);

async function init() {
  const heroEl = document.getElementById('featured');
  const gridEl = document.getElementById('discography');
  const modalEl = document.getElementById('album-modal');
  if (!heroEl || !gridEl || !modalEl) return;

  try {
    const raw = await getAlbums();
    const albums = (await Promise.all(raw.map(async a => ({
      ...normalizeAlbum(a),
      cover: await resolveCover(a)
    })))).sort(sortByDateDesc);
    renderHero(heroEl, albums);
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
    root.innerHTML = '<p class="muted">No featured release.</p>';
    return;
  }

  root.innerHTML = `
      <div class="featured-section">
        <div class="featured-section-header-row">
          <span class="featured-section-header">Featured</span>
        </div>
        <div class="featured-section-content">
          <div class="featured-section-art">
            <img src="${a.cover}" alt="${a.title} cover">
          </div>
          <div class="featured-section-info">
            <h2 class="featured-section-title">${a.title}</h2>
            <p class="featured-section-meta">${capitalize(a.type)}${a.releaseDate ? ' • ' + a.releaseDate : ''}</p>
            ${a.notes[0] ? `<p class="featured-section-tagline">${escapeHTML(a.notes[0])}</p>` : ''}
            <p class="featured-section-subtext">This is some blind text for the featured album subtext. You can replace it with any description or info you want to highlight here.</p>
            <div class="featured-section-actions"><a class="btn btn-primary listen-btn" href="${a.link}" target="_blank" rel="noopener">Listen</a></div>
          </div>
        </div>
      </div>`;
}

function renderDiscography(root, albums) {
  root.innerHTML = '';
  for (const a of albums) {
    const card = albumCard(a);
    root.appendChild(card);
  }
}

function albumCard(a) {
  const card = el('article', { class: 'album-card', tabindex: '0' });
  card.innerHTML = `
      <img class="album-cover" src="${a.cover}" alt="${a.title} cover">
      <h3 class="album-title">${a.title}</h3>
      <p class="album-meta">${capitalize(a.type)}${a.releaseDate ? ' • ' + a.releaseDate : ''}</p>
      ${a.notes[0] ? `<p class="album-blurb">${escapeHTML(a.notes[0])}</p>` : ''}
    `;
  card.addEventListener('click', () => openModal(a));
  card.addEventListener('keydown', e => { if (e.key === 'Enter') openModal(a); });
  return card;
}

function openModal(album) {
  const modal = document.getElementById('album-modal');
  modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <article class="modal-content" role="dialog" aria-modal="true">
        <button class="modal-close" aria-label="Close">&times;</button>
        <header class="modal-header">
          <img class="modal-cover" src="${album.cover}" alt="${album.title} cover">
          <div class="modal-info">
            <h2>${album.title}</h2>
            <p>${capitalize(album.type)}${album.releaseDate ? ' • ' + album.releaseDate : ''}</p>
            <p><a class="btn btn-primary" href="${album.link}" target="_blank" rel="noopener">Listen</a></p>
          </div>
        </header>
        <div class="modal-body">
          ${album.notes.map(p => `<p>${escapeHTML(p)}</p>`).join('')}
        </div>
      </article>`;

  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');

  const closeBtn = modal.querySelector('.modal-close');
  const backdrop = modal.querySelector('.modal-backdrop');
  const focusables = modal.querySelectorAll('a, button');
  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  function trap(e) {
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    } else if (e.key === 'Escape') { close(); }
  }

  function close() {
    modal.classList.add('hidden');
    modal.innerHTML = '';
    document.body.classList.remove('modal-open');
    document.removeEventListener('keydown', trap);
  }

  document.addEventListener('keydown', trap);
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  first.focus();
}

function el(tag, attrs) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  return node;
}
