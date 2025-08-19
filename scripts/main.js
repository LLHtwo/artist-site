import { setCopyrightYear } from './core/utils.js';
import { loadAndRenderAlbums } from './pages/homePage.js';
import { loadFeaturedAlbum, loadLatestReleaseAlbum } from './components/featured.js';
import { initMusicPage } from './pages/musicPage.js';
// modal is page-specific; we dynamically import it on music page to avoid loading it site-wide
let modalModulePromise = null;

// The fullscreen-modal module now hydrates any placeholders itself when imported.

function bootstrap() {
  setCopyrightYear();
  const isMusicPage = document.body.classList.contains('music-page');
  if (isMusicPage) {
    // Preload the modal module in parallel so album cards can open it quickly.
    modalModulePromise = import('./components/modal.js').catch(err => {
      console.warn('[main] failed to preload modal module', err);
      return null;
    });
    initMusicPage();
  } else {
    loadAndRenderAlbums();
  }
  loadFeaturedAlbum();
  loadLatestReleaseAlbum();

  // import fullscreen-modal module so it can hydrate any placeholders (it runs
  // its own hydration logic on import). This keeps main.js minimal.
  import('./components/fullscreen-modal.js').catch(err => console.warn('[main] failed to import fullscreen-modal', err));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

// Expose some legacy globals so inline HTML or existing code can still call them
window.loadAndRenderAlbums = loadAndRenderAlbums;
window.loadFeaturedAlbum = loadFeaturedAlbum;
window.loadLatestReleaseAlbum = loadLatestReleaseAlbum;
window.initMusicPage = initMusicPage;
// expose modal open function when available (backwards compatibility)
modalModulePromise && modalModulePromise.then(m => {
  if (m && typeof m.openModal === 'function') window.openModal = m.openModal;
}).catch(() => {});
