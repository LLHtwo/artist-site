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
  meta.className = 'modal-subtitle'; // use site's muted styling for modal meta
  meta.textContent = `${capitalize(album.type)}${album.releaseDate ? ' • ' + formatFancyDate(album.releaseDate) : ''}`;
  info.appendChild(meta);
  const streamRow = document.createElement('div');
  streamRow.className = 'modal-streams';
  // Build a canonical list of services and ensure each button uses its own link
  const UI = getUI();
  const services = [
    { key: 'spotify', label: UI.spotify || 'Spotify' },
    { key: 'apple-music', label: UI.appleMusic || UI.apple || 'Apple Music' },
    { key: 'youtube', label: UI.youtube || 'YouTube' }
  ];

  // Helper to get a service link from the album object.
  // Priority: top-level album[key] (e.g. album.spotify) -> album.links[key] -> common alt keys
  const getServiceLink = (albumObj, key) => {
    if (!albumObj || typeof albumObj !== 'object') return undefined;
    // top-level key on the album (matches how tags appear in assets/albums.json)
    if (albumObj[key]) return albumObj[key];
    // common alternative top-level keys for Apple Music
    if (key === 'apple' || key === 'apple-music') {
      if (albumObj.appleMusic) return albumObj.appleMusic;
      if (albumObj['apple_music']) return albumObj['apple_music'];
      if (albumObj['apple-music']) return albumObj['apple-music'];
    }
    // fall back to album.links object if present
    const links = albumObj.links;
    if (links && typeof links === 'object') {
  if (links[key]) return links[key];
  if (key === 'apple' || key === 'apple-music') return links.appleMusic || links['apple_music'] || links['apple-music'];
    }
    return undefined;
  };

  // If the album release date is in the future, show a single pre-save button
  // that uses the album.link (this is used for unreleased/coming-soon releases).
  const isFutureRelease = album && album.releaseDate && (new Date(album.releaseDate).getTime() > Date.now());
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
      // match other pages: use stream-btn markup with an inline svg image then label
      btn.className = 'btn stream-btn';
      btn.href = href;
      btn.target = '_blank';
      btn.rel = 'noopener';
      btn.setAttribute('aria-label', svc.label || capitalize(svc.key));

      // image src path mirrors index.html assets
      const img = document.createElement('img');
      const svgName = svc.key === 'apple' ? 'apple-music' : svc.key; // apple -> apple-music.svg
      img.src = `assets/svg/${svgName}.svg`;
      img.alt = svc.label || capitalize(svc.key);
      img.className = 'social-icon-img';
      btn.appendChild(img);

      // label text node
      const labelText = document.createTextNode(svc.label || capitalize(svc.key));
      btn.appendChild(labelText);

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
