/**
 * @typedef {{ prepend?: Array<Record<string, unknown>>; append?: Array<Record<string, unknown>> }} OverlayOps
 * @typedef {Record<string, Record<string, OverlayOps>>} PageOverlays
 * @typedef {{ key: string; slug: string; slot: string; position: 'prepend'|'append'; id: string; type: string; text: string }} OverlayRow
 */

/**
 * @param {PageOverlays} overlays
 * @returns {OverlayRow[]}
 */
export function flattenOverlays(overlays) {
  /** @type {OverlayRow[]} */
  const rows = [];

  for (const [slug, slots] of Object.entries(overlays ?? {})) {
    if (!slots || typeof slots !== 'object') {
      continue;
    }
    for (const [slot, ops] of Object.entries(slots)) {
      for (const position of /** @type {const} */ (['prepend', 'append'])) {
        const blocks = ops?.[position];
        if (!Array.isArray(blocks)) {
          continue;
        }
        blocks.forEach((block, index) => {
          if (!block || typeof block !== 'object') {
            return;
          }
          const props =
            block.props && typeof block.props === 'object' ? block.props : {};
          rows.push({
            key: `${slug}-${slot}-${position}-${String(block.id ?? index)}-${index}`,
            slug,
            slot,
            position,
            id: typeof block.id === 'string' ? block.id : `${slug}-${slot}-${position}-${index}`,
            type: typeof block.type === 'string' ? block.type : 'shell.announcement',
            text:
              typeof props.text === 'string'
                ? props.text
                : typeof props.message === 'string'
                  ? props.message
                  : '',
          });
        });
      }
    }
  }

  return rows;
}

/**
 * @param {OverlayRow[]} rows
 * @returns {PageOverlays}
 */
export function buildOverlaysFromRows(rows) {
  /** @type {PageOverlays} */
  const overlays = {};

  for (const row of rows) {
    const slug = row.slug.trim();
    const slot = row.slot.trim();
    if (!slug || !slot) {
      continue;
    }

    overlays[slug] ??= {};
    overlays[slug][slot] ??= { prepend: [], append: [] };
    const ops = overlays[slug][slot];
    ops.prepend ??= [];
    ops.append ??= [];

    /** @type {Record<string, unknown>} */
    const block = {
      id: row.id.trim() || `${slug}-${slot}-${row.position}`,
      type: row.type.trim() || 'shell.announcement',
      props: {},
    };

    if (row.type === 'shell.announcement' || row.text.trim() !== '') {
      block.props.text = row.text;
    }

    ops[row.position].push(block);
  }

  for (const slots of Object.values(overlays)) {
    for (const ops of Object.values(slots)) {
      if (Array.isArray(ops.prepend) && ops.prepend.length === 0) {
        delete ops.prepend;
      }
      if (Array.isArray(ops.append) && ops.append.length === 0) {
        delete ops.append;
      }
    }
  }

  return overlays;
}

/**
 * Move a row within the flat editor list (HTML5 DnD / ↑↓).
 *
 * @param {OverlayRow[]} rows
 * @param {string} fromKey
 * @param {number} toIndex  insert-before index in the current list
 * @returns {OverlayRow[]}
 */
export function moveOverlayRow(rows, fromKey, toIndex) {
  const fromIndex = rows.findIndex((row) => row.key === fromKey);
  if (fromIndex < 0) {
    return rows;
  }

  let insertAt = Math.max(0, Math.min(toIndex, rows.length));
  if (fromIndex < insertAt) {
    insertAt -= 1;
  }
  if (fromIndex === insertAt) {
    return rows;
  }

  const next = [...rows];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(insertAt, 0, moved);
  return next;
}

/**
 * @typedef {{ key: string; slug: string; slot: string; indices: number[]; rows: OverlayRow[] }} OverlayGroup
 */

/**
 * Group flat overlay rows by slug+slot (first-seen group order).
 *
 * @param {OverlayRow[]} rows
 * @returns {OverlayGroup[]}
 */
export function groupOverlayRows(rows) {
  /** @type {Map<string, OverlayGroup>} */
  const groups = new Map();

  rows.forEach((row, index) => {
    const slug = row.slug.trim();
    const slot = row.slot.trim();
    const key = `${slug || '(empty)'}::${slot || '(empty)'}`;
    let group = groups.get(key);
    if (!group) {
      group = { key, slug: row.slug, slot: row.slot, indices: [], rows: [] };
      groups.set(key, group);
    }
    group.indices.push(index);
    group.rows.push(row);
  });

  return [...groups.values()];
}

/**
 * @typedef {{ slug: string; slot: string }} OverlayPlaceholder
 */

/** Default empty-state / missing-group placeholders in Studio. */
export const DEFAULT_OVERLAY_PLACEHOLDERS = Object.freeze([
  Object.freeze({ slug: 'home', slot: 'main' }),
  Object.freeze({ slug: 'help', slot: 'main' }),
  Object.freeze({ slug: 'article', slot: 'main' }),
]);

export const OVERLAY_PLACEHOLDERS_STORAGE_KEY = 'front-studio.overlay-placeholders';
export const OVERLAY_PLACEHOLDER_CHOICES_STORAGE_KEY =
  'front-studio.overlay-placeholder-choices';

/** @typedef {'theme' | 'local' | 'merge'} PlaceholderConflictChoice */
/** @typedef {{ choice: PlaceholderConflictChoice; themeSignature: string }} PlaceholderConflictMemory */

/**
 * @param {unknown} value
 * @returns {OverlayPlaceholder | null}
 */
export function parseOverlayPlaceholder(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const slug = typeof value.slug === 'string' ? value.slug.trim() : '';
  const slot = typeof value.slot === 'string' ? value.slot.trim() : '';
  if (!slug || !slot) {
    return null;
  }

  return { slug, slot };
}

/**
 * Deduplicate slug.slot pairs while preserving order.
 *
 * @param {unknown} raw
 * @returns {OverlayPlaceholder[]}
 */
export function normalizeOverlayPlaceholders(raw) {
  if (!Array.isArray(raw)) {
    return [...DEFAULT_OVERLAY_PLACEHOLDERS];
  }

  /** @type {OverlayPlaceholder[]} */
  const out = [];
  const seen = new Set();

  for (const item of raw) {
    const parsed = parseOverlayPlaceholder(item);
    if (!parsed) {
      continue;
    }
    const key = `${parsed.slug}::${parsed.slot}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(parsed);
  }

  return out.length > 0 ? out : [...DEFAULT_OVERLAY_PLACEHOLDERS];
}

/**
 * @param {string | null | undefined} raw
 * @returns {OverlayPlaceholder[]}
 */
export function readOverlayPlaceholdersFromStorage(raw) {
  if (!raw || typeof raw !== 'string') {
    return [...DEFAULT_OVERLAY_PLACEHOLDERS];
  }

  try {
    return normalizeOverlayPlaceholders(JSON.parse(raw));
  } catch {
    return [...DEFAULT_OVERLAY_PLACEHOLDERS];
  }
}

/**
 * Placeholders for slug.slot pairs that have no overlay rows yet.
 *
 * @param {OverlayRow[]} rows
 * @param {OverlayPlaceholder[]} [defaults]
 * @returns {OverlayPlaceholder[]}
 */
export function missingOverlayPlaceholders(
  rows,
  defaults = DEFAULT_OVERLAY_PLACEHOLDERS,
) {
  const present = new Set(
    rows.map((row) => `${row.slug.trim()}::${row.slot.trim()}`),
  );

  return defaults.filter((item) => {
    const key = `${item.slug.trim()}::${item.slot.trim()}`;
    return !present.has(key);
  });
}

/**
 * @param {OverlayPlaceholder[]} list
 * @param {OverlayPlaceholder} item
 * @returns {OverlayPlaceholder[]}
 */
export function upsertOverlayPlaceholder(list, item) {
  const parsed = parseOverlayPlaceholder(item);
  if (!parsed) {
    return list;
  }

  return normalizeOverlayPlaceholders([...list, parsed]);
}

/**
 * @param {OverlayPlaceholder[]} list
 * @param {string} slug
 * @param {string} slot
 * @returns {OverlayPlaceholder[]}
 */
export function removeOverlayPlaceholder(list, slug, slot) {
  const key = `${slug.trim()}::${slot.trim()}`;
  const next = list.filter((item) => `${item.slug}::${item.slot}` !== key);
  return next.length > 0 ? next : [...DEFAULT_OVERLAY_PLACEHOLDERS];
}

/**
 * @param {OverlayPlaceholder[]} list
 * @returns {string}
 */
export function overlayPlaceholdersSignature(list) {
  return normalizeOverlayPlaceholders(list)
    .map((item) => `${item.slug}.${item.slot}`)
    .join('|');
}

/**
 * @param {OverlayPlaceholder[]} left
 * @param {OverlayPlaceholder[]} right
 * @returns {boolean}
 */
export function overlayPlaceholdersDiffer(left, right) {
  return overlayPlaceholdersSignature(left) !== overlayPlaceholdersSignature(right);
}

/**
 * @param {OverlayPlaceholder[]} left
 * @param {OverlayPlaceholder[]} right
 * @returns {OverlayPlaceholder[]}
 */
export function mergeOverlayPlaceholders(left, right) {
  return normalizeOverlayPlaceholders([...(left ?? []), ...(right ?? [])]);
}

/**
 * @param {OverlayPlaceholder[]} local
 * @param {OverlayPlaceholder[]} remote
 * @returns {{ onlyLocal: OverlayPlaceholder[]; onlyRemote: OverlayPlaceholder[]; shared: OverlayPlaceholder[] }}
 */
export function diffOverlayPlaceholders(local, remote) {
  const left = normalizeOverlayPlaceholders(local);
  const right = normalizeOverlayPlaceholders(remote);
  const leftKeys = new Set(left.map((item) => `${item.slug}.${item.slot}`));
  const rightKeys = new Set(right.map((item) => `${item.slug}.${item.slot}`));

  return {
    onlyLocal: left.filter((item) => !rightKeys.has(`${item.slug}.${item.slot}`)),
    onlyRemote: right.filter((item) => !leftKeys.has(`${item.slug}.${item.slot}`)),
    shared: left.filter((item) => rightKeys.has(`${item.slug}.${item.slot}`)),
  };
}

/**
 * @param {unknown} raw
 * @returns {Record<string, PlaceholderConflictMemory>}
 */
export function readPlaceholderConflictChoices(raw) {
  if (!raw || typeof raw !== 'string') {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    /** @type {Record<string, PlaceholderConflictMemory>} */
    const out = {};
    for (const [code, value] of Object.entries(parsed)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        continue;
      }
      const choice = value.choice;
      const themeSignature =
        typeof value.themeSignature === 'string' ? value.themeSignature : '';
      if (choice !== 'theme' && choice !== 'local' && choice !== 'merge') {
        continue;
      }
      if (typeof code !== 'string' || code.trim() === '' || themeSignature === '') {
        continue;
      }
      out[code] = { choice, themeSignature };
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * @param {Record<string, PlaceholderConflictMemory>} map
 * @param {string} themeCode
 * @param {PlaceholderConflictChoice} choice
 * @param {OverlayPlaceholder[]} themePlaceholders
 * @returns {Record<string, PlaceholderConflictMemory>}
 */
export function rememberPlaceholderConflictChoice(
  map,
  themeCode,
  choice,
  themePlaceholders,
) {
  const code = themeCode.trim();
  if (!code) {
    return map;
  }

  return {
    ...map,
    [code]: {
      choice,
      themeSignature: overlayPlaceholdersSignature(themePlaceholders),
    },
  };
}

/**
 * Remove a remembered conflict choice for one theme.
 *
 * @param {Record<string, PlaceholderConflictMemory>} map
 * @param {string} themeCode
 * @returns {Record<string, PlaceholderConflictMemory>}
 */
export function forgetPlaceholderConflictChoice(map, themeCode) {
  const code = themeCode.trim();
  if (!code || !Object.prototype.hasOwnProperty.call(map, code)) {
    return map;
  }

  const next = { ...map };
  delete next[code];
  return next;
}

/**
 * Serialize conflict choices for download / clipboard.
 *
 * @param {Record<string, PlaceholderConflictMemory>} map
 * @returns {string}
 */
export function exportPlaceholderConflictChoices(map) {
  const normalized = readPlaceholderConflictChoices(JSON.stringify(map ?? {}));
  return `${JSON.stringify(
    {
      schemaVersion: 1,
      kind: 'front-studio.overlay-placeholder-choices',
      choices: normalized,
    },
    null,
    2,
  )}\n`;
}

/**
 * Import conflict choices from JSON text. Merges by default; replace when mode=replace.
 *
 * @param {string} raw
 * @param {Record<string, PlaceholderConflictMemory>} [existing]
 * @param {'merge' | 'replace'} [mode]
 * @returns {{ ok: true, choices: Record<string, PlaceholderConflictMemory> } | { ok: false, error: string }}
 */
export function importPlaceholderConflictChoices(raw, existing = {}, mode = 'merge') {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return { ok: false, error: 'Import payload is empty' };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Import payload is not valid JSON' };
  }

  const source =
    parsed &&
    typeof parsed === 'object' &&
    !Array.isArray(parsed) &&
    parsed.choices &&
    typeof parsed.choices === 'object' &&
    !Array.isArray(parsed.choices)
      ? parsed.choices
      : parsed;

  const incoming = readPlaceholderConflictChoices(JSON.stringify(source ?? {}));
  if (Object.keys(incoming).length === 0) {
    return { ok: false, error: 'No placeholder conflict choices found in payload' };
  }

  if (mode === 'replace') {
    return { ok: true, choices: incoming };
  }

  return {
    ok: true,
    choices: {
      ...readPlaceholderConflictChoices(JSON.stringify(existing ?? {})),
      ...incoming,
    },
  };
}

/**
 * Bundle conflict choices + placeholder list (+ optional overlays draft) for Studio backup/transfer.
 *
 * @param {{
 *   choices?: Record<string, PlaceholderConflictMemory>;
 *   placeholders?: OverlayPlaceholder[];
 *   themeCode?: string;
 *   pageOverlays?: PageOverlays | null;
 * }} payload
 * @returns {string}
 */
export function exportStudioPlaceholderBundle(payload = {}) {
  const choices = readPlaceholderConflictChoices(JSON.stringify(payload.choices ?? {}));
  const placeholders = normalizeOverlayPlaceholders(payload.placeholders ?? []);

  /** @type {Record<string, unknown>} */
  const body = {
    schemaVersion: 1,
    kind: 'front-studio.overlay-placeholder-bundle',
    choices,
    placeholders,
  };

  if (typeof payload.themeCode === 'string' && payload.themeCode.trim() !== '') {
    body.themeCode = payload.themeCode.trim();
  }

  if (
    payload.pageOverlays &&
    typeof payload.pageOverlays === 'object' &&
    !Array.isArray(payload.pageOverlays)
  ) {
    body.pageOverlays = payload.pageOverlays;
  }

  return `${JSON.stringify(body, null, 2)}\n`;
}

/**
 * Merge pageOverlays maps by slug/slot (arrays concatenate).
 *
 * @param {PageOverlays | null | undefined} base
 * @param {PageOverlays | null | undefined} incoming
 * @returns {PageOverlays}
 */
export function mergePageOverlays(base, incoming) {
  /** @type {PageOverlays} */
  const out = {};

  for (const source of [base, incoming]) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      continue;
    }
    for (const [slug, slots] of Object.entries(source)) {
      if (!slots || typeof slots !== 'object' || Array.isArray(slots)) {
        continue;
      }
      out[slug] ??= {};
      for (const [slot, ops] of Object.entries(slots)) {
        if (!ops || typeof ops !== 'object' || Array.isArray(ops)) {
          continue;
        }
        out[slug][slot] ??= {};
        for (const position of /** @type {const} */ (['prepend', 'append'])) {
          const blocks = ops[position];
          if (!Array.isArray(blocks) || blocks.length === 0) {
            continue;
          }
          out[slug][slot][position] = [
            ...(out[slug][slot][position] ?? []),
            ...blocks,
          ];
        }
      }
    }
  }

  return out;
}

/**
 * Import a Studio placeholder bundle (or legacy choices-only payload).
 *
 * @param {string} raw
 * @param {{
 *   choices?: Record<string, PlaceholderConflictMemory>;
 *   placeholders?: OverlayPlaceholder[];
 *   pageOverlays?: PageOverlays | null;
 * }} [existing]
 * @param {'merge' | 'replace'} [mode]
 * @returns {{
 *   ok: true;
 *   choices: Record<string, PlaceholderConflictMemory>;
 *   placeholders: OverlayPlaceholder[];
 *   themeCode?: string;
 *   pageOverlays?: PageOverlays | null;
 * } | { ok: false; error: string }}
 */
export function importStudioPlaceholderBundle(raw, existing = {}, mode = 'merge') {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return { ok: false, error: 'Import payload is empty' };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Import payload is not valid JSON' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'Import payload must be a JSON object' };
  }

  const kind = typeof parsed.kind === 'string' ? parsed.kind : '';
  const hasBundleShape =
    kind === 'front-studio.overlay-placeholder-bundle' ||
    Array.isArray(parsed.placeholders) ||
    (parsed.choices && typeof parsed.choices === 'object') ||
    (parsed.pageOverlays && typeof parsed.pageOverlays === 'object');

  if (!hasBundleShape && kind === 'front-studio.overlay-placeholder-choices') {
    const choicesOnly = importPlaceholderConflictChoices(raw, existing.choices ?? {}, mode);
    if (!choicesOnly.ok) {
      return choicesOnly;
    }
    return {
      ok: true,
      choices: choicesOnly.choices,
      placeholders: normalizeOverlayPlaceholders(existing.placeholders ?? []),
      pageOverlays: existing.pageOverlays ?? null,
    };
  }

  const choicesResult = importPlaceholderConflictChoices(
    JSON.stringify({
      schemaVersion: 1,
      kind: 'front-studio.overlay-placeholder-choices',
      choices: parsed.choices ?? {},
    }),
    existing.choices ?? {},
    mode,
  );

  const hasPlaceholdersField = Array.isArray(parsed.placeholders);
  const incomingPlaceholders = hasPlaceholdersField
    ? normalizeOverlayPlaceholders(parsed.placeholders)
    : [];

  const hasOverlaysField =
    parsed.pageOverlays &&
    typeof parsed.pageOverlays === 'object' &&
    !Array.isArray(parsed.pageOverlays);

  if (!choicesResult.ok && !hasPlaceholdersField && !hasOverlaysField) {
    return choicesResult;
  }

  const existingPlaceholders = normalizeOverlayPlaceholders(existing.placeholders ?? []);
  let placeholders = existingPlaceholders;
  if (hasPlaceholdersField) {
    placeholders =
      mode === 'replace'
        ? incomingPlaceholders
        : normalizeOverlayPlaceholders([...existingPlaceholders, ...incomingPlaceholders]);
  }

  const choices = choicesResult.ok
    ? choicesResult.choices
    : readPlaceholderConflictChoices(JSON.stringify(existing.choices ?? {}));

  /** @type {PageOverlays | null | undefined} */
  let pageOverlays = existing.pageOverlays ?? null;
  if (hasOverlaysField) {
    pageOverlays =
      mode === 'replace'
        ? /** @type {PageOverlays} */ (parsed.pageOverlays)
        : mergePageOverlays(existing.pageOverlays, parsed.pageOverlays);
  }

  if (
    Object.keys(choices).length === 0 &&
    placeholders.length === 0 &&
    !(pageOverlays && Object.keys(pageOverlays).length > 0)
  ) {
    return { ok: false, error: 'No placeholders, overlays, or conflict choices found in payload' };
  }

  /** @type {{ ok: true; choices: Record<string, PlaceholderConflictMemory>; placeholders: OverlayPlaceholder[]; themeCode?: string; pageOverlays?: PageOverlays | null }} */
  const result = { ok: true, choices, placeholders, pageOverlays };
  if (typeof parsed.themeCode === 'string' && parsed.themeCode.trim() !== '') {
    result.themeCode = parsed.themeCode.trim();
  }
  return result;
}

/**
 * Warn when an imported bundle was exported for a different theme.
 *
 * @param {string | null | undefined} activeThemeCode
 * @param {string | null | undefined} bundleThemeCode
 * @returns {string | null}
 */
export function describeBundleThemeMismatch(activeThemeCode, bundleThemeCode) {
  const active =
    typeof activeThemeCode === 'string' ? activeThemeCode.trim() : '';
  const bundle =
    typeof bundleThemeCode === 'string' ? bundleThemeCode.trim() : '';

  if (!active || !bundle || active === bundle) {
    return null;
  }

  return `Bundle themeCode "${bundle}" differs from active theme "${active}"`;
}

export const LAST_IMPORTED_OVERLAYS_STORAGE_KEY =
  'front-studio.last-imported-overlays';

/** Warn when deferred overlays are older than this (7 days). */
export const DEFERRED_OVERLAYS_STALE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Serialize skipped import overlays for later apply.
 *
 * @param {PageOverlays | null | undefined} pageOverlays
 * @param {string | null | undefined} themeCode
 * @param {{ stashedAt?: string }} [options]
 * @returns {string | null}
 */
export function serializeLastImportedOverlays(pageOverlays, themeCode, options = {}) {
  if (
    !pageOverlays ||
    typeof pageOverlays !== 'object' ||
    Array.isArray(pageOverlays) ||
    Object.keys(pageOverlays).length === 0
  ) {
    return null;
  }

  const stashedAt =
    typeof options.stashedAt === 'string' && options.stashedAt.trim() !== ''
      ? options.stashedAt.trim()
      : new Date().toISOString();

  /** @type {Record<string, unknown>} */
  const body = {
    schemaVersion: 1,
    kind: 'front-studio.last-imported-overlays',
    pageOverlays,
    stashedAt,
  };

  if (typeof themeCode === 'string' && themeCode.trim() !== '') {
    body.themeCode = themeCode.trim();
  }

  return JSON.stringify(body);
}

/**
 * @param {unknown} raw
 * @returns {{ pageOverlays: PageOverlays; themeCode?: string; stashedAt?: string } | null}
 */
export function readLastImportedOverlays(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return null;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  if (
    !parsed.pageOverlays ||
    typeof parsed.pageOverlays !== 'object' ||
    Array.isArray(parsed.pageOverlays) ||
    Object.keys(parsed.pageOverlays).length === 0
  ) {
    return null;
  }

  /** @type {{ pageOverlays: PageOverlays; themeCode?: string; stashedAt?: string }} */
  const out = {
    pageOverlays: /** @type {PageOverlays} */ (parsed.pageOverlays),
  };

  if (typeof parsed.themeCode === 'string' && parsed.themeCode.trim() !== '') {
    out.themeCode = parsed.themeCode.trim();
  }

  if (typeof parsed.stashedAt === 'string' && parsed.stashedAt.trim() !== '') {
    out.stashedAt = parsed.stashedAt.trim();
  }

  return out;
}

/**
 * Human-readable summary for Studio status / button label context.
 *
 * @param {{ pageOverlays: PageOverlays; themeCode?: string; stashedAt?: string } | null | undefined} stash
 * @returns {string | null}
 */
export function describeLastImportedOverlays(stash) {
  if (
    !stash?.pageOverlays ||
    typeof stash.pageOverlays !== 'object' ||
    Object.keys(stash.pageOverlays).length === 0
  ) {
    return null;
  }

  const pages = Object.keys(stash.pageOverlays).length;
  const from = stash.themeCode ? ` from theme "${stash.themeCode}"` : '';
  return `${pages} overlay page(s)${from}`;
}

/**
 * Age / stale hint for deferred overlays.
 *
 * @param {{ stashedAt?: string } | null | undefined} stash
 * @param {number} [now]
 * @param {number} [staleAfterMs]
 * @returns {{ label: string; ageMs: number; stale: boolean } | null}
 */
export function describeLastImportedOverlaysAge(
  stash,
  now = Date.now(),
  staleAfterMs = DEFERRED_OVERLAYS_STALE_MS,
) {
  if (!stash?.stashedAt || typeof stash.stashedAt !== 'string') {
    return null;
  }

  const ts = Date.parse(stash.stashedAt);
  if (!Number.isFinite(ts)) {
    return null;
  }

  const ageMs = Math.max(0, now - ts);
  const days = Math.floor(ageMs / 86_400_000);
  const hours = Math.floor((ageMs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ageMs % 3_600_000) / 60_000);

  let label;
  if (days > 0) {
    label = `${days}d ${hours}h ago`;
  } else if (hours > 0) {
    label = `${hours}h ${minutes}m ago`;
  } else if (minutes > 0) {
    label = `${minutes}m ago`;
  } else {
    label = 'just now';
  }

  return {
    label,
    ageMs,
    stale: ageMs >= staleAfterMs,
  };
}

/**
 * Summarize a successful Studio bundle import for status copy.
 *
 * @param {{
 *   choices?: Record<string, unknown>;
 *   placeholders?: unknown[];
 *   pageOverlays?: PageOverlays | null;
 *   themeCode?: string;
 * }} result
 * @param {{ appliedOverlayPages?: number; mode?: 'merge' | 'replace'; overlaysSkipped?: boolean }} [options]
 * @returns {string}
 */
export function summarizeStudioBundleImport(result, options = {}) {
  const choiceCount =
    result?.choices && typeof result.choices === 'object'
      ? Object.keys(result.choices).length
      : 0;
  const placeholderCount = Array.isArray(result?.placeholders)
    ? result.placeholders.length
    : 0;
  const overlayPages =
    typeof options.appliedOverlayPages === 'number'
      ? options.appliedOverlayPages
      : result?.pageOverlays && typeof result.pageOverlays === 'object'
        ? Object.keys(result.pageOverlays).length
        : 0;
  const mode = options.mode === 'replace' ? 'Replaced' : 'Merged';
  const theme =
    typeof result?.themeCode === 'string' && result.themeCode.trim() !== ''
      ? ` · theme ${result.themeCode.trim()}`
      : '';
  const skipped = options.overlaysSkipped ? ' (overlays skipped — available under Apply last import)' : '';

  return `${mode} bundle: ${choiceCount} choice(s), ${placeholderCount} placeholder(s), ${overlayPages} overlay page(s)${theme}${skipped}`;
}
  if (!files || typeof files.length !== 'number' || files.length === 0) {
    return null;
  }

  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    if (!file || typeof file.name !== 'string') {
      continue;
    }
    const name = file.name.toLowerCase();
    const type = typeof file.type === 'string' ? file.type : '';
    if (name.endsWith('.json') || type.includes('json') || type === 'application/json') {
      return file;
    }
  }

  return files[0] ?? null;
}

/**
 * True when clipboard/textarea text looks like a Studio import payload.
 *
 * @param {unknown} raw
 * @returns {boolean}
 */
export function looksLikeStudioBundleJson(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return false;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return false;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return false;
  }

  const kind = typeof parsed.kind === 'string' ? parsed.kind : '';
  if (
    kind === 'front-studio.overlay-placeholder-bundle' ||
    kind === 'front-studio.overlay-placeholder-choices'
  ) {
    return true;
  }

  if (Array.isArray(parsed.placeholders)) {
    return true;
  }

  if (
    parsed.choices &&
    typeof parsed.choices === 'object' &&
    !Array.isArray(parsed.choices)
  ) {
    return true;
  }

  if (
    parsed.pageOverlays &&
    typeof parsed.pageOverlays === 'object' &&
    !Array.isArray(parsed.pageOverlays)
  ) {
    return true;
  }

  return false;
}

/**
 * Build an absolute URL for copying the share preview image path.
 *
 * @param {string | null | undefined} path
 * @param {string | null | undefined} origin
 * @returns {string | null}
 */
export function absoluteSharePreviewUrl(path, origin) {
  if (typeof path !== 'string' || path.trim() === '') {
    return null;
  }

  const trimmed = path.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const base =
    typeof origin === 'string' && origin.trim() !== ''
      ? origin.replace(/\/$/, '')
      : '';

  if (!base) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  return trimmed.startsWith('/') ? `${base}${trimmed}` : `${base}/${trimmed}`;
}

/**
 * Fallback share image when a locale-specific asset is missing.
 *
 * @param {string} slug
 * @returns {string}
 */
export function sharePreviewFallbackImage(slug) {
  const key = typeof slug === 'string' ? slug.trim() : '';
  if (key === 'help') {
    return '/brand/help-share.png';
  }
  if (key === 'article') {
    return '/brand/article-share.png';
  }
  return '/brand/home-share.png';
}

/**
 * Drop deferred overlays when stale (or return them unchanged).
 *
 * @param {{ pageOverlays: PageOverlays; themeCode?: string; stashedAt?: string } | null | undefined} stash
 * @param {number} [now]
 * @param {number} [staleAfterMs]
 * @returns {{ stash: typeof stash | null; cleared: boolean; age: ReturnType<typeof describeLastImportedOverlaysAge> }}
 */
export function pruneStaleLastImportedOverlays(
  stash,
  now = Date.now(),
  staleAfterMs = DEFERRED_OVERLAYS_STALE_MS,
) {
  const age = describeLastImportedOverlaysAge(stash, now, staleAfterMs);
  if (!stash?.pageOverlays) {
    return { stash: null, cleared: false, age: null };
  }
  if (age?.stale) {
    return { stash: null, cleared: true, age };
  }
  return { stash, cleared: false, age };
}

/**
 * Resolve deferred overlays into the active editor draft.
 *
 * @param {PageOverlays | null | undefined} current
 * @param {PageOverlays | null | undefined} deferred
 * @param {'replace' | 'merge'} [mode]
 * @returns {PageOverlays | null}
 */
export function resolveDeferredOverlaysApply(current, deferred, mode = 'replace') {
  if (
    !deferred ||
    typeof deferred !== 'object' ||
    Array.isArray(deferred) ||
    Object.keys(deferred).length === 0
  ) {
    return null;
  }

  if (mode === 'merge') {
    return mergePageOverlays(current, deferred);
  }

  return deferred;
}

/**
 * Apply a remembered conflict choice when signatures still match.
 *
 * @param {OverlayPlaceholder[]} local
 * @param {OverlayPlaceholder[]} theme
 * @param {PlaceholderConflictMemory | null | undefined} memory
 * @returns {OverlayPlaceholder[] | null} resolved list, or null to prompt
 */
export function applyRememberedPlaceholderChoice(local, theme, memory) {
  if (!memory || typeof memory !== 'object') {
    return null;
  }

  const themeSignature = overlayPlaceholdersSignature(theme);
  if (memory.themeSignature !== themeSignature) {
    return null;
  }

  if (memory.choice === 'theme') {
    return normalizeOverlayPlaceholders(theme);
  }
  if (memory.choice === 'local') {
    return normalizeOverlayPlaceholders(local);
  }
  if (memory.choice === 'merge') {
    return mergeOverlayPlaceholders(local, theme);
  }

  return null;
}
