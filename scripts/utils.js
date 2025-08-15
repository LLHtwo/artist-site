// scripts/utils.js

export const $ = (sel, root = document) => root.querySelector(sel);

export function slugify(str = '') {
  return String(str)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function formatYear(dateStr) {
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? '' : String(d.getFullYear());
}

export function isFuture(dateStr) {
  if (!dateStr) return true;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return true;
  return d.getTime() > Date.now();
}

export function formatFancyDate(dateStr) {
  if (!dateStr) return 'Upcoming';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'Upcoming';
  if (d.getTime() > Date.now()) return 'Upcoming';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export async function fetchJSON(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} loading ${path}`);
  return res.json();
}

// Utility: Get average color from an image
export function getAverageColor(imgEl, callback) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = imgEl.naturalWidth;
  canvas.height = imgEl.naturalHeight;
  ctx.drawImage(imgEl, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  }
  r = Math.round(r / count);
  g = Math.round(g / count);
  b = Math.round(b / count);
  callback(`rgb(${r},${g},${b})`);
}

export function setCopyrightYear() {
  const el = $('#year');
  if (el) el.textContent = new Date().getFullYear();
}

