import { setCopyrightYear } from './core/utils.js';
import { loadAndRenderAlbums } from './pages/homePage.js';
import { loadFeaturedAlbum, loadLatestReleaseAlbum } from './components/featured.js';
import { initMusicPage } from './pages/musicPage.js';

function bootstrap() {
  setCopyrightYear();
  const isMusicPage = document.body.classList.contains('music-page');
  if (isMusicPage) {
    initMusicPage();
  } else {
    loadAndRenderAlbums();
  }
  loadFeaturedAlbum();
  loadLatestReleaseAlbum();
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
