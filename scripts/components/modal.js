import { el } from '../core/dom.js';
import { getUI, capitalize, formatFancyDate } from '../core/utils.js';

export function openModal(album) {
  const modal = document.getElementById('album-modal');
  if (!modal) return;
  modal.textContent = '';
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  const article = document.createElement('article');
  article.className = 'modal-content modal-content--large';
  article.setAttribute('role', 'dialog');
  article.setAttribute('aria-modal', 'true');
  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.setAttribute('aria-label', getUI().close || 'Close');
  closeBtn.textContent = '\u00d7';
  const header = document.createElement('header');
  header.className = 'modal-header';
  const img = document.createElement('img');
  img.className = 'modal-cover';
  img.src = album.cover;
  img.alt = `${album.title} cover`;
  header.appendChild(img);
  const info = document.createElement('div');
  info.className = 'modal-info';
  const title = document.createElement('h2');
  title.textContent = album.title;
  title.className = 'modal-title';
  info.appendChild(title);
  const meta = document.createElement('p');
  meta.textContent = `${capitalize(album.type)}${album.releaseDate ? ' • ' + formatFancyDate(album.releaseDate) : ''}`;
  info.appendChild(meta);
  const streamRow = document.createElement('div');
  streamRow.className = 'modal-streams';
  if (album.links && typeof album.links === 'object') {
    for (const [k, v] of Object.entries(album.links)) {
      const btn = document.createElement('a');
      btn.className = 'btn btn-primary';
      btn.href = v;
      btn.target = '_blank';
      btn.rel = 'noopener';
      btn.textContent = capitalize(k);
      streamRow.appendChild(btn);
    }
  } else {
    const UI = getUI();
    const services = [UI.spotify || 'Spotify', UI.apple || 'Apple', 'YouTube'];
    for (const svc of services) {
      const btn = document.createElement('a');
      btn.className = 'btn btn-primary';
      btn.href = album.link || '#';
      btn.target = '_blank';
      btn.rel = 'noopener';
      btn.textContent = svc;
      streamRow.appendChild(btn);
    }
  }
  info.appendChild(streamRow);
  header.appendChild(info);
  article.appendChild(closeBtn);
  article.appendChild(header);
  const body = document.createElement('div');
  body.className = 'modal-body';
  if (album.note) {
    if (album.note.title) {
      const noteTitleEl = document.createElement('h3');
      noteTitleEl.className = 'modal-note-title modal-section-title';
      noteTitleEl.textContent = album.note.title;
      body.appendChild(noteTitleEl);
    }
    if (album.note.blurb) {
      const lead = document.createElement('p');
      lead.className = 'modal-lead';
      lead.textContent = album.note.blurb;
      body.appendChild(lead);
    } else if (album.notes && album.notes.length > 0) {
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
        if (sec.title) {
          const h = document.createElement('h3');
          h.className = 'modal-section-title';
          h.textContent = sec.title;
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
            p.innerHTML = bodyHTML;
            body.appendChild(p);
          }
        }
      }
    }
    if (album.note.media && Array.isArray(album.note.media)) {
      const mediaWrap = document.createElement('div');
      mediaWrap.className = 'modal-media';
      for (const m of album.note.media) {
        if (m.type === 'image') {
          const im = document.createElement('img');
          im.src = m.src;
          im.alt = m.alt || '';
          im.className = 'modal-media-image';
          mediaWrap.appendChild(im);
        } else if (m.type === 'audio') {
          const audio = document.createElement('audio');
          audio.controls = true;
          const src = document.createElement('source');
          src.src = m.src;
          audio.appendChild(src);
          mediaWrap.appendChild(audio);
        }
      }
      body.appendChild(mediaWrap);
    }
  } else {
    (album.notes || []).forEach(entry => {
      if (typeof entry === 'string') {
        const note = document.createElement('p');
        note.textContent = entry;
        body.appendChild(note);
      } else if (entry && typeof entry === 'object') {
        if (entry.type === 'title') {
          const h = document.createElement('h3');
          h.className = 'modal-section-title';
          h.textContent = entry.text;
          body.appendChild(h);
        } else if (entry.type === 'text') {
          const p = document.createElement('p');
          p.textContent = entry.text;
          body.appendChild(p);
        }
      }
    });
  }
  article.appendChild(body);
  modal.appendChild(backdrop);
  modal.appendChild(article);
  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  const focusables = article.querySelectorAll('a, button');
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
    modal.textContent = '';
    document.body.classList.remove('modal-open');
    document.removeEventListener('keydown', trap);
  }
  document.addEventListener('keydown', trap);
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  first && first.focus();
}

// expose to window for other modules/components that call window.openModal
window.openModal = openModal;
