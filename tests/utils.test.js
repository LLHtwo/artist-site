import { test } from 'node:test';
import assert from 'node:assert';

global.document = {
  querySelector: () => null,
  createElement: () => ({
    setAttribute() {},
    className: ''
  }),
  body: { dataset: {} },
  getElementById: () => null
};

const { slugify, isFuture } = await import('../scripts/core/utils.js');

test('slugify converts text to a URL-friendly slug', () => {
  assert.strictEqual(slugify('Hello World!'), 'hello-world');
});

test('isFuture detects future and past dates', () => {
  const nextYear = new Date().getFullYear() + 1;
  const lastYear = new Date().getFullYear() - 1;
  assert.strictEqual(isFuture(`${nextYear}-01-01`), true);
  assert.strictEqual(isFuture(`${lastYear}-01-01`), false);
});
