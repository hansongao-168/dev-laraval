import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { validate } from '../src/validate.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('schemas are valid JSON objects with $id', () => {
  for (const name of ['page-document.json', 'skin-manifest.json', 'theme.json']) {
    const raw = readFileSync(join(root, 'schemas', name), 'utf8');
    const schema = JSON.parse(raw);
    assert.equal(typeof schema, 'object');
    assert.ok(schema.$id);
    assert.ok(schema.title);
  }
});

test('validate accepts a minimal page document', () => {
  const schema = JSON.parse(readFileSync(join(root, 'schemas', 'page-document.json'), 'utf8'));
  const errors = validate(
    {
      schemaVersion: 1,
      page: { slug: 'home', channel: 'all', shellKey: 'storefront.main' },
      shell: {
        key: 'storefront.main',
        slots: {
          main: [{ id: 'b1', type: 'content.rich-text' }],
        },
      },
    },
    schema,
  );
  assert.deepEqual(errors, []);
});

test('validate rejects missing required fields and bad block call', () => {
  const schema = JSON.parse(readFileSync(join(root, 'schemas', 'page-document.json'), 'utf8'));
  const errors = validate(
    {
      schemaVersion: 1,
      page: { slug: 'home' },
      shell: {
        key: 'storefront.main',
        slots: {
          main: [{ id: 'b1', type: 'x', call: { onError: 'nope' } }],
        },
      },
    },
    schema,
  );

  assert.ok(errors.some((e) => e.includes('channel')));
  assert.ok(errors.some((e) => e.includes('shellKey')));
  assert.ok(errors.some((e) => e.includes('capability') || e.includes('enum')));
});
