// scripts/main.js

import { setCopyrightYear, getAverageColor } from './utils.js';
import { loadAndRenderAlbums, loadFeaturedAlbum, loadLatestReleaseAlbum } from './albums.js';

document.addEventListener('DOMContentLoaded', () => {
  setCopyrightYear();
  loadAndRenderAlbums();

  const featuredImg = document.getElementById('featured-cover');
  const heroSection = document.querySelector('.hero');
  if (featuredImg && heroSection) {
    const applyColor = () => getAverageColor(featuredImg, avgColor => {
      heroSection.style.background = `linear-gradient(180deg, ${avgColor} 0%, transparent 100%)`;
    });
    featuredImg.addEventListener('load', applyColor);
    if (featuredImg.complete) applyColor();
  }

  loadFeaturedAlbum();
  loadLatestReleaseAlbum();
});

