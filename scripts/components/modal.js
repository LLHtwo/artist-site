import { el } from '../core/dom.js';
import { getUI, capitalize, formatFancyDate, renderInlineMarkdown } from '../core/utils.js';

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
  // If there's a blurb or a top-level notes string, feature it here with the title/meta/streams
  const blurbText = (album && album.note && album.note.blurb) ? album.note.blurb : ((album && album.notes && album.notes.length > 0 && typeof album.notes[0] === 'string') ? album.notes[0] : '');
  const blurbPlaced = Boolean(blurbText);
  if (blurbText) {
    const blurb = document.createElement('p');
    blurb.className = 'modal-lead modal-blurb';
    blurb.innerHTML = renderInlineMarkdown(blurbText);
    info.appendChild(blurb);
  }
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
    // Add a fourth button that links to the canonical album.link (if present)
    if (album && album.link) {
      const moreBtn = document.createElement('a');
      moreBtn.className = 'btn stream-btn';
      moreBtn.href = album.link;
      moreBtn.target = '_blank';
      moreBtn.rel = 'noopener';
      moreBtn.setAttribute('aria-label', UI.open || UI.more || 'More');

      // globe icon (matches other stream buttons which use inline svg images)
      const globeImg = document.createElement('img');
      globeImg.src = 'assets/svg/globe.svg';
      globeImg.alt = UI.open || UI.more || 'More';
      globeImg.className = 'social-icon-img';
      moreBtn.appendChild(globeImg);

      // label text node
      moreBtn.appendChild(document.createTextNode(UI.open || UI.more || 'More'));
      streamRow.appendChild(moreBtn);
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
    // If blurb was shown in the header and originated from album.notes[0], skip that
    // first string so we don't duplicate it inside the body.
    let notesToRender = album.notes || [];
    if (blurbPlaced && notesToRender.length > 0 && typeof notesToRender[0] === 'string') {
      // only drop the first entry if it matches the blurb text
      if (notesToRender[0].trim() === blurbText.trim()) notesToRender = notesToRender.slice(1);
    }
    notesToRender.forEach(entry => {
      if (typeof entry === 'string') {
        const note = document.createElement('p');
        note.innerHTML = renderInlineMarkdown(entry);
        body.appendChild(note);
      } else if (entry && typeof entry === 'object') {
        if (entry.type === 'title') {
          const h = document.createElement('h3');
          h.className = 'modal-section-title';
          h.innerHTML = renderInlineMarkdown(entry.text || '');
          body.appendChild(h);
        } else if (entry.type === 'text') {
          const p = document.createElement('p');
          p.innerHTML = renderInlineMarkdown(entry.text || '');
          body.appendChild(p);
        }
      }
    });
  }
  // --- ADD: lock scroll by fixing body and preserving scrollY ---
  const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.dataset.modalScrollY = String(scrollY);
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  // --- END ADD ---

  article.appendChild(body);
  modal.appendChild(backdrop);
  modal.appendChild(article);

  // --- ADD: center stream buttons vertically between cover bottom and blurb bottom ---
  let streamPositionResizeHandler = null;
  function centerStreamBetweenElements() {
    const coverEl = article.querySelector('.modal-cover');
    const blurbEl = article.querySelector('.modal-lead.modal-blurb') || article.querySelector('.modal-lead');
    const streamEl = article.querySelector('.modal-streams');
    if (!coverEl || !streamEl) return;

    streamEl.style.transform = '';

    const coverRect = coverEl.getBoundingClientRect();
    const blurbRect = blurbEl ? blurbEl.getBoundingClientRect() : coverRect;
    const streamRect = streamEl.getBoundingClientRect();

    const cs = getComputedStyle(streamEl);
    const mt = parseFloat(cs.marginTop) || 0;
    const mb = parseFloat(cs.marginBottom) || 0;
    const effectiveStreamHeight = streamRect.height + mt + mb;

    const targetY = (coverRect.bottom + blurbRect.bottom) / 2;
    // compute center of the visual region including margins:
    const streamCenter = streamRect.top - mt + effectiveStreamHeight / 2;

    const delta = targetY - streamCenter;
    streamEl.style.transform = `translateY(${delta}px)`;
  }

  // run once after element is in DOM (we just appended it)
  centerStreamBetweenElements();
  // keep it responsive
  streamPositionResizeHandler = () => centerStreamBetweenElements();
  window.addEventListener('resize', streamPositionResizeHandler);
  // --- END ADD ---

  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  const focusables = article.querySelectorAll('a, button');
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  let closing = false;
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
    if (closing) return;
    closing = true;
    // remove keyboard trap immediately
    document.removeEventListener('keydown', trap);
    // remove outside handlers immediately to prevent further events
    if (outsideClickHandler) modal.removeEventListener('click', outsideClickHandler);
    if (backdropClickHandler) backdrop.removeEventListener('click', backdropClickHandler);

    // get previous scroll position
    const prev = parseInt(document.body.dataset.modalScrollY || '0', 10);

    // remove the fixed positioning we set when opening
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    delete document.body.dataset.modalScrollY;

    // Immediately teardown the modal DOM/CSS so page reflow happens now
    teardown();

    // Ensure instant jump without smooth scroll interfering, then restore position
    const docEl = document.documentElement;
    const prevScrollBehavior = docEl.style.scrollBehavior;
    docEl.style.scrollBehavior = 'auto';
    window.scrollTo(0, prev);
    docEl.style.scrollBehavior = prevScrollBehavior;
  }
  // Close when clicking outside the article (on the modal root)
  // Attach these listeners after a short delay so the original click that
  // opened the modal doesn't immediately bubble and trigger a close.
  // Track handlers so we can remove them on teardown and avoid duplicates
  let outsideClickHandler = null;
  let backdropClickHandler = null;
  function addOutsideClickHandlers() {
    outsideClickHandler = (e) => { if (e.target === modal) close(); };
    backdropClickHandler = () => close();
    modal.addEventListener('click', outsideClickHandler);
    backdrop.addEventListener('click', backdropClickHandler);
  }
  setTimeout(addOutsideClickHandlers, 50);

  // Safely handle teardown after animation finishes (or fallback timeout)
  function teardown() {
  modal.classList.add('hidden');
  // remove outside handlers if attached
  if (outsideClickHandler) modal.removeEventListener('click', outsideClickHandler);
  if (backdropClickHandler) backdrop.removeEventListener('click', backdropClickHandler);
  modal.textContent = '';
  document.body.classList.remove('modal-open');
  closing = false;

  // remove resize listener we added
  if (streamPositionResizeHandler) {
    window.removeEventListener('resize', streamPositionResizeHandler);
    streamPositionResizeHandler = null;
  }
  }

  // (animationend/fallback are handled when closing starts)

  document.addEventListener('keydown', trap);
  closeBtn.addEventListener('click', close);
  // (backdrop click listener is added slightly delayed above)
  first && first.focus();
}

// expose to window for other modules/components that call window.openModal
window.openModal = openModal;
