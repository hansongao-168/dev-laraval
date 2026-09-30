import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyRememberedPlaceholderChoice,
  buildOverlaysFromRows,
  describeBundleThemeMismatch,
  describeLastImportedOverlays,
  describeLastImportedOverlaysAge,
  diffOverlayPlaceholders,
  exportPlaceholderConflictChoices,
  exportStudioPlaceholderBundle,
  flattenOverlays,
  forgetPlaceholderConflictChoice,
  groupOverlayRows,
  importPlaceholderConflictChoices,
  importStudioPlaceholderBundle,
  mergeOverlayPlaceholders,
  mergePageOverlays,
  missingOverlayPlaceholders,
  moveOverlayRow,
  normalizeOverlayPlaceholders,
  overlayPlaceholdersDiffer,
  absoluteSharePreviewUrl,
  looksLikeStudioBundleJson,
  pruneStaleLastImportedOverlays,
  pickDroppedImportFile,
  readLastImportedOverlays,
  readOverlayPlaceholdersFromStorage,
  readPlaceholderConflictChoices,
  rememberPlaceholderConflictChoice,
  removeOverlayPlaceholder,
  resolveDeferredOverlaysApply,
  serializeLastImportedOverlays,
  sharePreviewFallbackImage,
  summarizeStudioBundleImport,
  upsertOverlayPlaceholder,
} from '../src/app/(desktop)/dev/front-studio/theme-overlays.mjs';

test('flatten and build overlays round-trip', () => {
  const overlays = {
    home: {
      main: {
        prepend: [
          {
            id: 'xmas-announce',
            type: 'shell.announcement',
            props: { text: 'Merry' },
          },
        ],
        append: [
          {
            id: 'xmas-end',
            type: 'shell.announcement',
            props: { text: 'Bye' },
          },
        ],
      },
    },
  };

  const rows = flattenOverlays(overlays);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].position, 'prepend');
  assert.equal(rows[1].position, 'append');

  const rebuilt = buildOverlaysFromRows(rows);
  assert.equal(rebuilt.home.main.prepend?.[0].id, 'xmas-announce');
  assert.equal(rebuilt.home.main.append?.[0].id, 'xmas-end');
  assert.equal(rebuilt.home.main.prepend?.[0].props.text, 'Merry');
});

test('buildOverlaysFromRows skips blank slug/slot', () => {
  const rebuilt = buildOverlaysFromRows([
    {
      key: '1',
      slug: '  ',
      slot: 'main',
      position: 'prepend',
      id: 'a',
      type: 'shell.announcement',
      text: 'x',
    },
  ]);
  assert.deepEqual(rebuilt, {});
});

test('moveOverlayRow reorders and is stable on no-op', () => {
  const rows = [
    { key: 'a', slug: 'home', slot: 'main', position: 'prepend', id: 'a', type: 'shell.announcement', text: 'A' },
    { key: 'b', slug: 'home', slot: 'main', position: 'prepend', id: 'b', type: 'shell.announcement', text: 'B' },
    { key: 'c', slug: 'home', slot: 'main', position: 'append', id: 'c', type: 'shell.announcement', text: 'C' },
  ];

  const moved = moveOverlayRow(rows, 'c', 0);
  assert.deepEqual(moved.map((row) => row.key), ['c', 'a', 'b']);

  const same = moveOverlayRow(rows, 'a', 0);
  assert.equal(same, rows);

  const missing = moveOverlayRow(rows, 'missing', 1);
  assert.equal(missing, rows);
});

test('groupOverlayRows buckets by slug.slot in first-seen order', () => {
  const rows = [
    { key: 'a', slug: 'home', slot: 'main', position: 'prepend', id: 'a', type: 'shell.announcement', text: 'A' },
    { key: 'b', slug: 'help', slot: 'header', position: 'prepend', id: 'b', type: 'shell.announcement', text: 'B' },
    { key: 'c', slug: 'home', slot: 'main', position: 'append', id: 'c', type: 'shell.announcement', text: 'C' },
    { key: 'd', slug: 'home', slot: 'footer', position: 'prepend', id: 'd', type: 'shell.announcement', text: 'D' },
  ];

  const groups = groupOverlayRows(rows);
  assert.equal(groups.length, 3);
  assert.equal(groups[0].key, 'home::main');
  assert.deepEqual(groups[0].rows.map((row) => row.key), ['a', 'c']);
  assert.deepEqual(groups[0].indices, [0, 2]);
  assert.equal(groups[1].key, 'help::header');
  assert.deepEqual(groups[1].rows.map((row) => row.key), ['b']);
  assert.equal(groups[2].key, 'home::footer');
  assert.deepEqual(groups[2].rows.map((row) => row.key), ['d']);
});

test('missingOverlayPlaceholders skips occupied slug.slot pairs', () => {
  const rows = [
    { key: 'a', slug: 'home', slot: 'main', position: 'prepend', id: 'a', type: 'shell.announcement', text: 'A' },
  ];

  const missing = missingOverlayPlaceholders(rows);
  assert.deepEqual(
    missing.map((item) => `${item.slug}.${item.slot}`),
    ['help.main', 'article.main'],
  );
});

test('normalize and mutate overlay placeholders', () => {
  const normalized = normalizeOverlayPlaceholders([
    { slug: ' home ', slot: 'main' },
    { slug: 'home', slot: 'main' },
    { slug: '', slot: 'footer' },
    { slug: 'checkout', slot: 'header' },
  ]);
  assert.deepEqual(
    normalized.map((item) => `${item.slug}.${item.slot}`),
    ['home.main', 'checkout.header'],
  );

  const upserted = upsertOverlayPlaceholder(normalized, { slug: 'help', slot: 'main' });
  assert.deepEqual(
    upserted.map((item) => `${item.slug}.${item.slot}`),
    ['home.main', 'checkout.header', 'help.main'],
  );

  const removed = removeOverlayPlaceholder(upserted, 'home', 'main');
  assert.deepEqual(
    removed.map((item) => `${item.slug}.${item.slot}`),
    ['checkout.header', 'help.main'],
  );

  assert.deepEqual(
    readOverlayPlaceholdersFromStorage('not-json').map((item) => `${item.slug}.${item.slot}`),
    ['home.main', 'help.main', 'article.main'],
  );
});

test('diff and merge overlay placeholders', () => {
  const local = [
    { slug: 'home', slot: 'main' },
    { slug: 'checkout', slot: 'header' },
  ];
  const remote = [
    { slug: 'home', slot: 'main' },
    { slug: 'help', slot: 'main' },
  ];

  assert.equal(overlayPlaceholdersDiffer(local, remote), true);
  assert.equal(overlayPlaceholdersDiffer(local, local), false);

  const diff = diffOverlayPlaceholders(local, remote);
  assert.deepEqual(
    diff.onlyLocal.map((item) => `${item.slug}.${item.slot}`),
    ['checkout.header'],
  );
  assert.deepEqual(
    diff.onlyRemote.map((item) => `${item.slug}.${item.slot}`),
    ['help.main'],
  );
  assert.deepEqual(
    diff.shared.map((item) => `${item.slug}.${item.slot}`),
    ['home.main'],
  );

  assert.deepEqual(
    mergeOverlayPlaceholders(local, remote).map((item) => `${item.slug}.${item.slot}`),
    ['home.main', 'checkout.header', 'help.main'],
  );
});

test('remembered placeholder conflict choices apply when signatures match', () => {
  const local = [
    { slug: 'home', slot: 'main' },
    { slug: 'checkout', slot: 'header' },
  ];
  const theme = [
    { slug: 'home', slot: 'main' },
    { slug: 'help', slot: 'main' },
  ];

  const remembered = rememberPlaceholderConflictChoice({}, 'christmas', 'merge', theme);
  assert.equal(remembered.christmas.choice, 'merge');
  assert.ok(remembered.christmas.themeSignature.includes('home.main'));

  const applied = applyRememberedPlaceholderChoice(local, theme, remembered.christmas);
  assert.deepEqual(
    applied?.map((item) => `${item.slug}.${item.slot}`),
    ['home.main', 'checkout.header', 'help.main'],
  );

  const stale = applyRememberedPlaceholderChoice(local, [{ slug: 'home', slot: 'footer' }], remembered.christmas);
  assert.equal(stale, null);

  assert.deepEqual(
    readPlaceholderConflictChoices(JSON.stringify(remembered)).christmas.choice,
    'merge',
  );
  assert.deepEqual(readPlaceholderConflictChoices('nope'), {});

  const forgotten = forgetPlaceholderConflictChoice(remembered, 'christmas');
  assert.equal(forgotten.christmas, undefined);
  assert.equal(forgetPlaceholderConflictChoice(remembered, 'missing'), remembered);

  const exported = exportPlaceholderConflictChoices(remembered);
  assert.match(exported, /front-studio\.overlay-placeholder-choices/);
  const merged = importPlaceholderConflictChoices(exported, {}, 'merge');
  assert.equal(merged.ok, true);
  if (merged.ok) {
    assert.equal(merged.choices.christmas.choice, 'merge');
  }

  const replaced = importPlaceholderConflictChoices(
    exportPlaceholderConflictChoices({
      national_day: {
        choice: 'theme',
        themeSignature: 'home.main',
      },
    }),
    remembered,
    'replace',
  );
  assert.equal(replaced.ok, true);
  if (replaced.ok) {
    assert.equal(replaced.choices.christmas, undefined);
    assert.equal(replaced.choices.national_day.choice, 'theme');
  }

  assert.equal(importPlaceholderConflictChoices('{').ok, false);

  const bundle = exportStudioPlaceholderBundle({
    choices: remembered,
    placeholders: [
      { slug: 'home', slot: 'main' },
      { slug: 'help', slot: 'footer' },
    ],
  });
  assert.match(bundle, /front-studio\.overlay-placeholder-bundle/);
  const importedBundle = importStudioPlaceholderBundle(bundle, {}, 'replace');
  assert.equal(importedBundle.ok, true);
  if (importedBundle.ok) {
    assert.equal(importedBundle.choices.christmas.choice, 'merge');
    assert.deepEqual(
      importedBundle.placeholders.map((item) => `${item.slug}.${item.slot}`),
      ['home.main', 'help.footer'],
    );
  }

  const legacy = importStudioPlaceholderBundle(
    exportPlaceholderConflictChoices(remembered),
    { placeholders: [{ slug: 'article', slot: 'main' }] },
    'merge',
  );
  assert.equal(legacy.ok, true);
  if (legacy.ok) {
    assert.equal(legacy.choices.christmas.choice, 'merge');
    assert.deepEqual(
      legacy.placeholders.map((item) => `${item.slug}.${item.slot}`),
      ['article.main'],
    );
  }

  const withOverlays = exportStudioPlaceholderBundle({
    themeCode: 'christmas',
    choices: remembered,
    placeholders: [{ slug: 'home', slot: 'main' }],
    pageOverlays: {
      home: {
        main: {
          prepend: [{ id: 'a', type: 'shell.announcement', props: { text: 'A' } }],
        },
      },
    },
  });
  assert.match(withOverlays, /"themeCode": "christmas"/);
  const importedOverlays = importStudioPlaceholderBundle(
    withOverlays,
    {
      pageOverlays: {
        home: {
          main: {
            append: [{ id: 'b', type: 'shell.announcement', props: { text: 'B' } }],
          },
        },
      },
    },
    'merge',
  );
  assert.equal(importedOverlays.ok, true);
  if (importedOverlays.ok) {
    assert.equal(importedOverlays.themeCode, 'christmas');
    assert.equal(importedOverlays.pageOverlays?.home?.main?.prepend?.[0]?.id, 'a');
    assert.equal(importedOverlays.pageOverlays?.home?.main?.append?.[0]?.id, 'b');
  }

  const mergedOps = mergePageOverlays(
    { home: { main: { prepend: [{ id: '1', type: 'shell.announcement' }] } } },
    { home: { main: { prepend: [{ id: '2', type: 'shell.announcement' }] } } },
  );
  assert.deepEqual(
    mergedOps.home.main.prepend?.map((block) => block.id),
    ['1', '2'],
  );

  assert.equal(describeBundleThemeMismatch('christmas', 'christmas'), null);
  assert.equal(describeBundleThemeMismatch('christmas', ''), null);
  assert.match(
    describeBundleThemeMismatch('christmas', 'national-day') ?? '',
    /national-day/,
  );

  assert.equal(serializeLastImportedOverlays({}, 'christmas'), null);
  assert.equal(readLastImportedOverlays(''), null);
  const stashed = serializeLastImportedOverlays(
    {
      home: {
        main: {
          prepend: [{ id: 'skip', type: 'shell.announcement' }],
        },
      },
    },
    'national-day',
    { stashedAt: '2026-09-20T00:00:00.000Z' },
  );
  assert.match(stashed ?? '', /last-imported-overlays/);
  const loaded = readLastImportedOverlays(stashed);
  assert.equal(loaded?.themeCode, 'national-day');
  assert.equal(loaded?.stashedAt, '2026-09-20T00:00:00.000Z');
  assert.equal(loaded?.pageOverlays?.home?.main?.prepend?.[0]?.id, 'skip');
  assert.match(describeLastImportedOverlays(loaded) ?? '', /national-day/);
  assert.equal(describeLastImportedOverlays(null), null);

  const ageFresh = describeLastImportedOverlaysAge(
    loaded,
    Date.parse('2026-09-20T02:30:00.000Z'),
  );
  assert.equal(ageFresh?.stale, false);
  assert.match(ageFresh?.label ?? '', /2h/);

  const ageStale = describeLastImportedOverlaysAge(
    loaded,
    Date.parse('2026-09-28T00:00:00.000Z'),
  );
  assert.equal(ageStale?.stale, true);
  assert.match(ageStale?.label ?? '', /8d/);

  const prunedFresh = pruneStaleLastImportedOverlays(
    loaded,
    Date.parse('2026-09-20T02:30:00.000Z'),
  );
  assert.equal(prunedFresh.cleared, false);
  assert.equal(prunedFresh.stash?.themeCode, 'national-day');

  const prunedStale = pruneStaleLastImportedOverlays(
    loaded,
    Date.parse('2026-09-28T00:00:00.000Z'),
  );
  assert.equal(prunedStale.cleared, true);
  assert.equal(prunedStale.stash, null);

  assert.equal(sharePreviewFallbackImage('help'), '/brand/help-share.png');
  assert.equal(sharePreviewFallbackImage('article'), '/brand/article-share.png');
  assert.equal(sharePreviewFallbackImage('home'), '/brand/home-share.png');

  const jsonFile = { name: 'bundle.json', type: 'application/json' };
  const txtFile = { name: 'notes.txt', type: 'text/plain' };
  assert.equal(pickDroppedImportFile([txtFile, jsonFile]), jsonFile);
  assert.equal(pickDroppedImportFile([txtFile]), txtFile);
  assert.equal(pickDroppedImportFile([]), null);

  assert.equal(
    looksLikeStudioBundleJson(
      JSON.stringify({ kind: 'front-studio.overlay-placeholder-bundle', placeholders: [] }),
    ),
    true,
  );
  assert.equal(looksLikeStudioBundleJson('{nope'), false);
  assert.equal(looksLikeStudioBundleJson('{"foo":1}'), false);
  assert.equal(
    absoluteSharePreviewUrl('/brand/home-share.png', 'https://example.test'),
    'https://example.test/brand/home-share.png',
  );
  assert.equal(
    absoluteSharePreviewUrl('https://cdn.test/x.png', 'https://example.test'),
    'https://cdn.test/x.png',
  );
  assert.equal(absoluteSharePreviewUrl('/brand/home-share.png', ''), '/brand/home-share.png');

  assert.match(
    summarizeStudioBundleImport(
      {
        choices: { christmas: { choice: 'theme', themeSignature: 'x' } },
        placeholders: [{ slug: 'home', slot: 'main' }],
        pageOverlays: { home: {} },
        themeCode: 'christmas',
      },
      { mode: 'merge', appliedOverlayPages: 0, overlaysSkipped: true },
    ),
    /Merged bundle: 1 choice\(s\), 1 placeholder\(s\), 0 overlay page\(s\) · theme christmas \(overlays skipped/,
  );

  const current = {
    home: { main: { prepend: [{ id: 'cur', type: 'shell.announcement' }] } },
  };
  const deferred = {
    home: { main: { prepend: [{ id: 'def', type: 'shell.announcement' }] } },
  };
  assert.deepEqual(
    resolveDeferredOverlaysApply(current, deferred, 'replace')?.home.main.prepend?.map(
      (b) => b.id,
    ),
    ['def'],
  );
  assert.deepEqual(
    resolveDeferredOverlaysApply(current, deferred, 'merge')?.home.main.prepend?.map(
      (b) => b.id,
    ),
    ['cur', 'def'],
  );
  assert.equal(resolveDeferredOverlaysApply(current, {}, 'merge'), null);
});
