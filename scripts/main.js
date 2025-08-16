// scripts/main.js

import { setCopyrightYear, getAverageColor } from './utils.js';
import { loadAndRenderAlbums, loadFeaturedAlbum, loadLatestReleaseAlbum } from './home-page.js';

document.addEventListener('DOMContentLoaded', () => {
  // Basic page setup
  setCopyrightYear();

  // Decide which albums renderer to use
  const isMusicPage = document.body.classList.contains('music-page');

  if (!isMusicPage) {
    // Old list renderer (does nothing if #albums isn't present)
    loadAndRenderAlbums();
  }

  // Dynamically tint the hero section with the average color of the featured cover (home only; no-ops elsewhere)
  const featuredImg = document.getElementById('featured-cover');
  const heroSection = document.querySelector('.hero');
  if (featuredImg && heroSection) {
    const applyColor = () => getAverageColor(featuredImg, avgColor => {
      heroSection.style.background = `linear-gradient(180deg, ${avgColor} 0%, transparent 100%)`;
    });
    featuredImg.addEventListener('load', applyColor);
    if (featuredImg.complete) applyColor();
  }

  // Home page widgets (safe to call; they return early if the elements don't exist)
  loadFeaturedAlbum();
  loadLatestReleaseAlbum();
});
