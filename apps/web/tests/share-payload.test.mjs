import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  composeShareText,
  fetchShareImageFile,
  fileNameForShareImage,
  normalizeShareToastDwellMs,
  shareStatusMessage,
  shareWithOptionalImageFile,
} from '../src/lib/front-experience/share-payload.mjs';

test('composeShareText appends image URL when present', () => {
  assert.equal(composeShareText('Hello', 'https://x/a.png'), 'Hello\nhttps://x/a.png');
  assert.equal(composeShareText('', 'https://x/a.png'), 'https://x/a.png');
  assert.equal(composeShareText('Hello', '  '), 'Hello');
});

test('fileNameForShareImage maps content types', () => {
  assert.equal(fileNameForShareImage('image/jpeg'), 'share.jpg');
  assert.equal(fileNameForShareImage('image/webp'), 'share.webp');
  assert.equal(fileNameForShareImage('image/png'), 'share.png');
  assert.equal(fileNameForShareImage(null), 'share.png');
});

test('fetchShareImageFile builds a File from a successful fetch', async () => {
  const blob = new Blob([Uint8Array.from([1, 2, 3])], { type: 'image/png' });
  const file = await fetchShareImageFile('https://cdn.example/brand/help.png', {
    fetch: async () =>
      ({
        ok: true,
        blob: async () => blob,
      }),
  });

  assert.ok(file);
  assert.equal(file.name, 'share.png');
  assert.equal(file.type, 'image/png');
});

test('shareWithOptionalImageFile prefers files when canShare allows', async () => {
  const shared = [];
  const blob = new Blob([Uint8Array.from([9])], { type: 'image/png' });

  const result = await shareWithOptionalImageFile(
    { title: 'Help', text: 'Help\nhttps://x/a.png', url: 'https://app/help' },
    'https://x/a.png',
    {
      canShare: (data) => Array.isArray(data.files) && data.files.length === 1,
      share: async (data) => {
        shared.push(data);
      },
      fetchShareImageFile: async () =>
        new File([blob], 'share.png', { type: 'image/png' }),
    },
  );

  assert.equal(result, 'shared-file');
  assert.equal(shared.length, 1);
  assert.equal(shared[0].files?.[0]?.name, 'share.png');
});

test('shareWithOptionalImageFile falls back to link share', async () => {
  const shared = [];
  const result = await shareWithOptionalImageFile(
    { title: 'Help', text: 'Help', url: 'https://app/help' },
    '',
    {
      canShare: () => true,
      share: async (data) => {
        shared.push(data);
      },
      fetchShareImageFile: async () => null,
    },
  );

  assert.equal(result, 'shared-link');
  assert.equal(shared[0].url, 'https://app/help');
});

test('shareStatusMessage covers toast copy', () => {
  assert.equal(shareStatusMessage('idle'), null);
  assert.equal(shareStatusMessage('shared'), '已分享');
  assert.equal(shareStatusMessage('shared', { sharedFile: true }), '已分享（含图片）');
  assert.match(shareStatusMessage('copied') ?? '', /剪贴板/);
  assert.match(shareStatusMessage('error') ?? '', /分享失败/);
});

test('normalizeShareToastDwellMs clamps and falls back', () => {
  assert.equal(normalizeShareToastDwellMs(1500), 1500);
  assert.equal(normalizeShareToastDwellMs(0), 0);
  assert.equal(normalizeShareToastDwellMs('5000'), 5000);
  assert.equal(normalizeShareToastDwellMs(-1), 3200);
  assert.equal(normalizeShareToastDwellMs('nope'), 3200);
  assert.equal(normalizeShareToastDwellMs(999999), 60000);
});
