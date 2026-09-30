import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addBlockToSlot,
  createBlockId,
  finalIndexForDrop,
  isThemeOverlayBlock,
  moveBlockInSlot,
  moveBlockToSlot,
  removeBlockFromSlot,
  stripThemeOverlayBlocks,
  updateBlockCall,
  updateBlockProps,
} from '../src/core/document.js';
import { fetchPage } from '../src/core/fetch.js';
import { flattenSlots, resolveBlockComponent } from '../src/core/registry.js';
import {
  absoluteAssetUrl,
  normalizeSeoLocale,
  resolvePageShareImage,
  resolveSeoImage,
} from '../src/core/seo.js';

test('flattenSlots orders known slots first', () => {
  const rows = flattenSlots({
    floating: [{ id: 'f1', type: 'shell.fab' }],
    main: [{ id: 'm1', type: 'content.rich-text' }],
    header: [{ id: 'h1', type: 'shell.nav-bar' }],
  });

  assert.deepEqual(
    rows.map((r) => r.block.id),
    ['h1', 'm1', 'f1'],
  );
});

test('resolveBlockComponent falls back to unknown', () => {
  const registry = {
    'shell.unknown-block': () => 'unknown',
    'shell.nav-bar': () => 'nav',
  };

  assert.equal(resolveBlockComponent(registry, 'shell.nav-bar')(), 'nav');
  assert.equal(resolveBlockComponent(registry, 'missing.type')(), 'unknown');
});

test('document helpers add move and remove blocks', () => {
  const base = {
    schemaVersion: 1,
    page: { slug: 'home', channel: 'all', shellKey: 'storefront.main' },
    shell: {
      key: 'storefront.main',
      slots: {
        main: [{ id: 'a', type: 'mall.banner-carousel' }],
      },
    },
  };

  const withSecond = addBlockToSlot(base, 'main', {
    id: createBlockId('mall.product-grid'),
    type: 'mall.product-grid',
    props: { collection: 'hot' },
  });
  assert.equal(withSecond.shell.slots.main.length, 2);

  const moved = moveBlockInSlot(withSecond, 'main', withSecond.shell.slots.main[1].id, -1);
  assert.equal(moved.shell.slots.main[0].type, 'mall.product-grid');

  const removed = removeBlockFromSlot(moved, 'main', moved.shell.slots.main[0].id);
  assert.equal(removed.shell.slots.main.length, 1);
  assert.equal(removed.shell.slots.main[0].id, 'a');
});

test('moveBlockToSlot moves across slots and within slot', () => {
  const base = {
    schemaVersion: 1,
    page: { slug: 'home', channel: 'all', shellKey: 'storefront.main' },
    shell: {
      key: 'storefront.main',
      slots: {
        main: [
          { id: 'a', type: 'mall.banner-carousel' },
          { id: 'b', type: 'mall.product-grid' },
          { id: 'c', type: 'mall.category-nav' },
        ],
        footer: [],
      },
    },
  };

  const across = moveBlockToSlot(base, 'main', 'b', 'footer', 0);
  assert.deepEqual(
    across.shell.slots.main.map((b) => b.id),
    ['a', 'c'],
  );
  assert.deepEqual(
    across.shell.slots.footer.map((b) => b.id),
    ['b'],
  );

  const within = moveBlockToSlot(base, 'main', 'a', 'main', 2);
  assert.deepEqual(
    within.shell.slots.main.map((b) => b.id),
    ['b', 'c', 'a'],
  );

  assert.equal(finalIndexForDrop('main', 0, 'main', 2), 1);
  assert.equal(finalIndexForDrop('main', 2, 'main', 0), 0);
  assert.equal(finalIndexForDrop('main', 0, 'footer', 0), 0);
});

test('updateBlockProps merges and replaces props', () => {
  const base = {
    schemaVersion: 1,
    page: { slug: 'home', channel: 'all', shellKey: 'storefront.main' },
    shell: {
      key: 'storefront.main',
      slots: {
        header: [{ id: 'n1', type: 'shell.nav-bar', props: { navLocation: 'header' } }],
      },
    },
  };

  const merged = updateBlockProps(base, 'header', 'n1', { text: 'Hi' });
  assert.equal(merged.shell.slots.header[0].props.navLocation, 'header');
  assert.equal(merged.shell.slots.header[0].props.text, 'Hi');

  const replaced = updateBlockProps(base, 'header', 'n1', { navLocation: 'footer' }, { merge: false });
  assert.deepEqual(replaced.shell.slots.header[0].props, { navLocation: 'footer' });
});

test('updateBlockCall sets and clears call nodes', () => {
  const base = {
    schemaVersion: 1,
    page: { slug: 'home', channel: 'all', shellKey: 'storefront.main' },
    shell: {
      key: 'storefront.main',
      slots: {
        main: [{ id: 'g1', type: 'mall.product-grid', props: { collection: 'hot' } }],
      },
    },
  };

  const withCall = updateBlockCall(base, 'main', 'g1', {
    id: 'hot',
    module: 'mall-storefront-api',
    capability: 'mall.catalog.collection',
    args: { collection: 'hot', limit: 8 },
    onError: 'empty',
  });
  assert.equal(withCall.shell.slots.main[0].call.capability, 'mall.catalog.collection');
  assert.equal(withCall.shell.slots.main[0].call.args.limit, 8);

  const cleared = updateBlockCall(withCall, 'main', 'g1', null);
  assert.equal(cleared.shell.slots.main[0].call, undefined);
});

test('fetchPage forwards id q and query extras', async () => {
  /** @type {string[]} */
  const paths = [];
  const http = {
    async request(path) {
      paths.push(path);
      return {
        ok: true,
        status: 200,
        data: {
          data: {
            document: { page: { slug: 'help' } },
            skin: { code: 'default' },
          },
        },
      };
    },
  };

  await fetchPage(http, {
    slug: 'help',
    channel: 'web',
    id: 42,
    q: '运费',
    page: 2,
    query: { lang: 'zh', empty: '', skip: null },
  });

  assert.equal(paths.length, 1);
  const url = new URL(paths[0], 'http://example.test');
  assert.equal(url.pathname, '/api/v1/front-pages/help');
  assert.equal(url.searchParams.get('channel'), 'web');
  assert.equal(url.searchParams.get('id'), '42');
  assert.equal(url.searchParams.get('q'), '运费');
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(url.searchParams.get('lang'), 'zh');
  assert.equal(url.searchParams.has('empty'), false);
  assert.equal(url.searchParams.has('skip'), false);
});

test('stripThemeOverlayBlocks removes overlay-only blocks', () => {
  const base = {
    schemaVersion: 1,
    page: { slug: 'home', channel: 'all', shellKey: 'storefront.main' },
    shell: {
      key: 'storefront.main',
      slots: {
        main: [
          { id: 'xmas', type: 'shell.announcement', props: { themeOverlay: true, text: 'Hi' } },
          { id: 'banner', type: 'mall.banner-carousel', props: {} },
        ],
      },
    },
  };

  const stripped = stripThemeOverlayBlocks(base);
  assert.deepEqual(
    stripped.shell.slots.main.map((b) => b.id),
    ['banner'],
  );
  assert.equal(isThemeOverlayBlock(base.shell.slots.main[0]), true);
  assert.equal(isThemeOverlayBlock(base.shell.slots.main[1]), false);
});

test('resolveSeoImage and resolvePageShareImage are locale-aware', () => {
  assert.equal(normalizeSeoLocale('zh-CN'), 'zh_CN');
  assert.equal(
    resolveSeoImage(
      {
        image: '/brand/help-share.png',
        images: {
          zh_CN: '/brand/help-share.zh_CN.png',
          en: '/brand/help-share.en.png',
        },
      },
      'en-US',
    ),
    '/brand/help-share.en.png',
  );

  const page = {
    document: {
      meta: {
        seo: {
          image: '/brand/home-share.png',
          images: { zh_CN: '/brand/home-share.zh_CN.png' },
        },
      },
    },
  };

  assert.equal(
    resolvePageShareImage(page, 'zh-CN', 'https://example.test'),
    'https://example.test/brand/home-share.zh_CN.png',
  );
  assert.equal(
    absoluteAssetUrl('/brand/x.png', 'https://cdn.example'),
    'https://cdn.example/brand/x.png',
  );
});
