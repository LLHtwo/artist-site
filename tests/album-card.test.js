import { test } from 'node:test';
import assert from 'node:assert/strict';
import { albumCard } from '../scripts/components/album-card.js';

function setupDOM(){
  global.document = {
    createElement(tag){
      return {
        tagName: tag.toUpperCase(),
        className: '',
        attributes: {},
        innerHTML: '',
        setAttribute(name, value){ this.attributes[name] = value; },
        get outerHTML(){
          const attrs = Object.entries(this.attributes)
            .map(([k,v]) => `${k}="${v}"`).join(' ');
          const cls = this.className ? `class="${this.className}"` : '';
          const all = [cls, attrs].filter(Boolean).join(' ');
          return `<${tag}${all ? ' '+all : ''}>${this.innerHTML}</${tag}>`;
        }
      };
    }
  };
}

test('renders card with highlight and upcoming classes', () => {
  setupDOM();
  const album = { title: 'Test', type: 'single', releaseDate: '2099-01-01', cover: 'cover.jpg', link: 'l', spotify: 's', apple: 'a' };
  const card = albumCard(album, { highlight: true });
  assert.equal(card.tagName, 'ARTICLE');
  assert(card.className.includes('album'));
  assert(card.className.includes('highlight'));
  assert(card.className.includes('upcoming'));
  assert(card.innerHTML.includes('Listen'));
});

test('omits buttons when links missing', () => {
  setupDOM();
  const album = { title: 'NoLinks', type: 'album', releaseDate: '2020-01-01', cover: 'x' };
  const card = albumCard(album);
  assert(!card.innerHTML.includes('Spotify'));
  assert(!card.innerHTML.includes('Apple'));
});

