/**
 * @param {import('./types.d.ts').BlockRegistry} registry
 * @param {string} type
 */
export function resolveBlockComponent(registry, type) {
  return registry[type] ?? registry['shell.unknown-block'] ?? null;
}

/**
 * Flatten slot map into ordered render list: header → main → footer → floating → rest.
 *
 * @param {Record<string, import('./types.d.ts').BlockInstance[]>} slots
 * @returns {Array<{ slot: string; block: import('./types.d.ts').BlockInstance }>}
 */
export function flattenSlots(slots) {
  const order = ['header', 'main', 'footer', 'floating'];
  /** @type {Array<{ slot: string; block: import('./types.d.ts').BlockInstance }>} */
  const out = [];
  const seen = new Set();

  for (const key of order) {
    const blocks = slots?.[key];
    if (!Array.isArray(blocks)) continue;
    seen.add(key);
    for (const block of blocks) {
      out.push({ slot: key, block });
    }
  }

  for (const [key, blocks] of Object.entries(slots ?? {})) {
    if (seen.has(key) || !Array.isArray(blocks)) continue;
    for (const block of blocks) {
      out.push({ slot: key, block });
    }
  }

  return out;
}
