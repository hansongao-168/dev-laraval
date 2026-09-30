import type { BlockInstance, PageDocument } from './types.d.ts';

export function createBlockId(type: string): string;

export function addBlockToSlot(
  document: PageDocument,
  slot: string,
  block: BlockInstance,
): PageDocument;

export function removeBlockFromSlot(
  document: PageDocument,
  slot: string,
  blockId: string,
): PageDocument;

export function moveBlockInSlot(
  document: PageDocument,
  slot: string,
  blockId: string,
  direction: -1 | 1,
): PageDocument;

export function moveBlockToSlot(
  document: PageDocument,
  fromSlot: string,
  blockId: string,
  toSlot: string,
  toIndex: number,
): PageDocument;

export function finalIndexForDrop(
  fromSlot: string,
  fromIndex: number,
  toSlot: string,
  insertBeforeIndex: number,
): number;

export function updateBlockProps(
  document: PageDocument,
  slot: string,
  blockId: string,
  props: Record<string, unknown>,
  options?: { merge?: boolean },
): PageDocument;

export function updateBlockCall(
  document: PageDocument,
  slot: string,
  blockId: string,
  call: BlockInstance['call'] | null | undefined,
): PageDocument;

export function isThemeOverlayBlock(block: BlockInstance | null | undefined): boolean;

export function stripThemeOverlayBlocks(document: PageDocument): PageDocument;
