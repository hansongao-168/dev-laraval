/**
 * @param {import('./types.d.ts').PageDocument} document
 * @param {string} slot
 * @returns {import('./types.d.ts').BlockInstance[]}
 */
function slotBlocks(document, slot) {
  const blocks = document?.shell?.slots?.[slot];
  return Array.isArray(blocks) ? blocks : [];
}

/**
 * @param {import('./types.d.ts').PageDocument} document
 * @param {string} slot
 * @param {import('./types.d.ts').BlockInstance[]} blocks
 * @returns {import('./types.d.ts').PageDocument}
 */
function withSlotBlocks(document, slot, blocks) {
  return {
    ...document,
    shell: {
      ...document.shell,
      slots: {
        ...document.shell.slots,
        [slot]: blocks,
      },
    },
  };
}

/**
 * @param {string} type
 */
export function createBlockId(type) {
  const safe = type.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `b-${safe}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * @param {import('./types.d.ts').PageDocument} document
 * @param {string} slot
 * @param {import('./types.d.ts').BlockInstance} block
 * @returns {import('./types.d.ts').PageDocument}
 */
export function addBlockToSlot(document, slot, block) {
  return withSlotBlocks(document, slot, [...slotBlocks(document, slot), block]);
}

/**
 * @param {import('./types.d.ts').PageDocument} document
 * @param {string} slot
 * @param {string} blockId
 * @returns {import('./types.d.ts').PageDocument}
 */
export function removeBlockFromSlot(document, slot, blockId) {
  return withSlotBlocks(
    document,
    slot,
    slotBlocks(document, slot).filter((block) => block.id !== blockId),
  );
}

/**
 * @param {import('./types.d.ts').PageDocument} document
 * @param {string} slot
 * @param {string} blockId
 * @param {-1 | 1} direction
 * @returns {import('./types.d.ts').PageDocument}
 */
export function moveBlockInSlot(document, slot, blockId, direction) {
  const blocks = [...slotBlocks(document, slot)];
  const index = blocks.findIndex((block) => block.id === blockId);

  if (index < 0) {
    return document;
  }

  const target = index + direction;

  if (target < 0 || target >= blocks.length) {
    return document;
  }

  const current = blocks[index];
  blocks[index] = blocks[target];
  blocks[target] = current;

  return withSlotBlocks(document, slot, blocks);
}

/**
 * Move a block within the same slot or across slots.
 * `toIndex` is the final index in the destination slot after the move.
 *
 * @param {import('./types.d.ts').PageDocument} document
 * @param {string} fromSlot
 * @param {string} blockId
 * @param {string} toSlot
 * @param {number} toIndex
 * @returns {import('./types.d.ts').PageDocument}
 */
export function moveBlockToSlot(document, fromSlot, blockId, toSlot, toIndex) {
  const fromBlocks = [...slotBlocks(document, fromSlot)];
  const fromIndex = fromBlocks.findIndex((block) => block.id === blockId);

  if (fromIndex < 0) {
    return document;
  }

  const [block] = fromBlocks.splice(fromIndex, 1);

  if (fromSlot === toSlot) {
    const target = Math.max(0, Math.min(toIndex, fromBlocks.length));
    fromBlocks.splice(target, 0, block);

    return withSlotBlocks(document, fromSlot, fromBlocks);
  }

  const next = withSlotBlocks(document, fromSlot, fromBlocks);
  const toBlocks = [...slotBlocks(next, toSlot)];
  const target = Math.max(0, Math.min(toIndex, toBlocks.length));
  toBlocks.splice(target, 0, block);

  return withSlotBlocks(next, toSlot, toBlocks);
}

/**
 * Convert "insert before visual index" into the final index for moveBlockToSlot.
 *
 * @param {string} fromSlot
 * @param {number} fromIndex
 * @param {string} toSlot
 * @param {number} insertBeforeIndex
 */
export function finalIndexForDrop(fromSlot, fromIndex, toSlot, insertBeforeIndex) {
  if (fromSlot === toSlot && fromIndex < insertBeforeIndex) {
    return insertBeforeIndex - 1;
  }

  return insertBeforeIndex;
}

/**
 * Replace props on a block (shallow merge when merge=true).
 *
 * @param {import('./types.d.ts').PageDocument} document
 * @param {string} slot
 * @param {string} blockId
 * @param {Record<string, unknown>} props
 * @param {{ merge?: boolean }} [options]
 * @returns {import('./types.d.ts').PageDocument}
 */
export function updateBlockProps(document, slot, blockId, props, options = {}) {
  const merge = options.merge !== false;
  const blocks = slotBlocks(document, slot).map((block) => {
    if (block.id !== blockId) {
      return block;
    }

    const nextProps = merge
      ? { ...(block.props ?? {}), ...props }
      : { ...props };

    return {
      ...block,
      props: nextProps,
    };
  });

  return withSlotBlocks(document, slot, blocks);
}

/**
 * Set or clear a block's YAML call node.
 * Pass `null` / `undefined` to remove the call.
 *
 * @param {import('./types.d.ts').PageDocument} document
 * @param {string} slot
 * @param {string} blockId
 * @param {import('./types.d.ts').BlockInstance['call'] | null | undefined} call
 * @returns {import('./types.d.ts').PageDocument}
 */
export function updateBlockCall(document, slot, blockId, call) {
  const blocks = slotBlocks(document, slot).map((block) => {
    if (block.id !== blockId) {
      return block;
    }

    if (call == null) {
      const next = { ...block };
      delete next.call;
      return next;
    }

    return {
      ...block,
      call: { ...call },
    };
  });

  return withSlotBlocks(document, slot, blocks);
}

/**
 * @param {import('./types.d.ts').BlockInstance | null | undefined} block
 */
export function isThemeOverlayBlock(block) {
  return Boolean(block?.props && block.props.themeOverlay === true);
}

/**
 * Remove runtime theme pageOverlay blocks before Studio writeback.
 *
 * @param {import('./types.d.ts').PageDocument} document
 * @returns {import('./types.d.ts').PageDocument}
 */
export function stripThemeOverlayBlocks(document) {
  const slots = document?.shell?.slots ?? {};
  /** @type {Record<string, import('./types.d.ts').BlockInstance[]>} */
  const nextSlots = {};

  for (const [slot, blocks] of Object.entries(slots)) {
    if (!Array.isArray(blocks)) {
      continue;
    }
    nextSlots[slot] = blocks.filter((block) => !isThemeOverlayBlock(block));
  }

  return {
    ...document,
    shell: {
      ...document.shell,
      slots: nextSlots,
    },
  };
}
