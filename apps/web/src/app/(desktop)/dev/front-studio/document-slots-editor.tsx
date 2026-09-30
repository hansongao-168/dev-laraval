'use client';

import { useState } from 'react';
import type { BlockInstance, BlockTypeInfo, PageDocument } from '@erp/front-experience/core';
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
} from '@erp/front-experience/core';
import type { CapabilityInfo } from '@erp/front-experience/core';
import { BlockCallEditor } from './block-call-editor';
import { BlockPropsEditor } from './block-props-editor';

type ShellInfo = { key: string; slots: Array<{ key: string }> };

type Props = {
  document: PageDocument;
  blockTypes: BlockTypeInfo[];
  capabilities: CapabilityInfo[];
  shells: ShellInfo[];
  onChange: (document: PageDocument) => void;
};

type DragPayload = {
  slot: string;
  blockId: string;
  index: number;
};

const SLOT_ORDER = ['header', 'main', 'footer', 'floating'];
const DND_MIME = 'application/x-front-studio-block';

function orderedSlots(document: PageDocument, shells: ShellInfo[]): string[] {
  const shell = shells.find((item) => item.key === document.shell.key);
  const fromShell = shell?.slots.map((slot) => slot.key) ?? [];
  const keys = new Set([...fromShell, ...Object.keys(document.shell.slots ?? {})]);
  const ordered = SLOT_ORDER.filter((key) => keys.has(key));
  for (const key of keys) {
    if (!ordered.includes(key)) {
      ordered.push(key);
    }
  }
  return ordered;
}

export function DocumentSlotsEditor({
  document,
  blockTypes,
  capabilities,
  shells,
  onChange,
}: Props) {
  const slots = orderedSlots(document, shells);
  const [dragging, setDragging] = useState<DragPayload | null>(null);
  const [dropHint, setDropHint] = useState<{ slot: string; index: number } | null>(null);
  const [selected, setSelected] = useState<{ slot: string; blockId: string } | null>(null);

  function update(next: PageDocument) {
    onChange(next);
  }

  const selectedBlock = selected
    ? (document.shell.slots?.[selected.slot] ?? []).find((block) => block.id === selected.blockId)
    : null;
  const selectedType = selectedBlock
    ? blockTypes.find((item) => item.type === selectedBlock.type)
    : undefined;

  function addBlock(slot: string, type: string) {
    const meta = blockTypes.find((item) => item.type === type);
    const block: BlockInstance = {
      id: createBlockId(type),
      type,
      props: { ...(meta?.defaultProps ?? {}) },
      ...(meta?.defaultCall ? { call: { ...meta.defaultCall } } : {}),
    };
    update(addBlockToSlot(document, slot, block));
    setSelected({ slot, blockId: block.id });
  }

  function dropAt(toSlot: string, insertBeforeIndex: number) {
    const payload = dragging;
    if (!payload) {
      return;
    }

    if (payload.slot === toSlot && payload.index === insertBeforeIndex) {
      setDropHint(null);
      return;
    }

    // Dropping onto itself (same visual position) is a no-op.
    if (payload.slot === toSlot && payload.index + 1 === insertBeforeIndex) {
      setDropHint(null);
      return;
    }

    const toIndex = finalIndexForDrop(payload.slot, payload.index, toSlot, insertBeforeIndex);
    update(moveBlockToSlot(document, payload.slot, payload.blockId, toSlot, toIndex));
    setDropHint(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Slots</h2>
          <p className="text-xs text-slate-500">
            Drag blocks between slots, or use ↑↓. Preview updates live; write back via Git.
          </p>
        </div>
      </div>

      {slots.map((slot) => {
        const blocks = document.shell.slots?.[slot] ?? [];

        return (
          <div
            key={slot}
            className={`rounded border bg-slate-50/70 p-3 ${
              dropHint?.slot === slot ? 'border-teal-400' : 'border-slate-200'
            }`}
            onDragOver={(event) => {
              if (!dragging) {
                return;
              }
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (
                event.currentTarget === event.target ||
                !(event.target as HTMLElement).closest('[data-block-row]')
              ) {
                dropAt(slot, blocks.length);
              }
            }}
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {slot}
              </h3>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <span>Add</span>
                <select
                  className="rounded border border-slate-300 bg-white px-2 py-1"
                  defaultValue=""
                  onChange={(e) => {
                    const type = e.target.value;
                    if (type) {
                      addBlock(slot, type);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="" disabled>
                    block type…
                  </option>
                  {blockTypes.map((type) => (
                    <option key={type.type} value={type.type}>
                      {type.type}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {blocks.length === 0 ? (
              <div
                className={`rounded border border-dashed px-3 py-6 text-center text-xs ${
                  dropHint?.slot === slot
                    ? 'border-teal-400 bg-teal-50 text-teal-800'
                    : 'border-slate-200 text-slate-400'
                }`}
                onDragOver={(event) => {
                  if (!dragging) {
                    return;
                  }
                  event.preventDefault();
                  event.stopPropagation();
                  setDropHint({ slot, index: 0 });
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  dropAt(slot, 0);
                }}
              >
                Drop blocks here
              </div>
            ) : (
              <ul className="space-y-2">
                {blocks.map((block, index) => (
                  <li key={block.id}>
                    {dropHint?.slot === slot && dropHint.index === index ? (
                      <div className="mb-2 h-1 rounded bg-teal-500" />
                    ) : null}
                    <div
                      data-block-row
                      draggable
                      onDragStart={(event) => {
                        const payload: DragPayload = { slot, blockId: block.id, index };
                        event.dataTransfer.setData(DND_MIME, JSON.stringify(payload));
                        event.dataTransfer.setData('text/plain', JSON.stringify(payload));
                        event.dataTransfer.effectAllowed = 'move';
                        setDragging(payload);
                      }}
                      onDragEnd={() => {
                        setDragging(null);
                        setDropHint(null);
                      }}
                      onDragOver={(event) => {
                        if (!dragging) {
                          return;
                        }
                        event.preventDefault();
                        event.stopPropagation();
                        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                        const before = event.clientY < rect.top + rect.height / 2;
                        setDropHint({ slot, index: before ? index : index + 1 });
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                        const before = event.clientY < rect.top + rect.height / 2;
                        dropAt(slot, before ? index : index + 1);
                      }}
                      className={`flex cursor-grab flex-wrap items-center gap-2 rounded border bg-white px-3 py-2 text-xs active:cursor-grabbing ${
                        dragging?.blockId === block.id
                          ? 'border-teal-300 opacity-60'
                          : selected?.blockId === block.id
                            ? 'border-teal-500 ring-1 ring-teal-200'
                            : isThemeOverlayBlock(block)
                              ? 'border-amber-300 bg-amber-50'
                              : 'border-slate-200'
                      }`}
                      onClick={() => setSelected({ slot, blockId: block.id })}
                    >
                      <span className="select-none text-slate-300" aria-hidden>
                        ∷
                      </span>
                      <code className="font-medium text-slate-800">{block.type}</code>
                      <span className="text-slate-400">{block.id}</span>
                      {isThemeOverlayBlock(block) ? (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                          theme overlay
                          {typeof block.props?.themeCode === 'string'
                            ? ` · ${block.props.themeCode}`
                            : ''}
                        </span>
                      ) : null}
                      <div className="ml-auto flex gap-1">
                        <button
                          type="button"
                          className="rounded border border-slate-200 px-2 py-0.5 hover:bg-slate-50 disabled:opacity-40"
                          disabled={index === 0}
                          onClick={() => update(moveBlockInSlot(document, slot, block.id, -1))}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="rounded border border-slate-200 px-2 py-0.5 hover:bg-slate-50 disabled:opacity-40"
                          disabled={index === blocks.length - 1}
                          onClick={() => update(moveBlockInSlot(document, slot, block.id, 1))}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="rounded border border-rose-200 px-2 py-0.5 text-rose-700 hover:bg-rose-50"
                          onClick={(event) => {
                            event.stopPropagation();
                            update(removeBlockFromSlot(document, slot, block.id));
                            if (selected?.blockId === block.id) {
                              setSelected(null);
                            }
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
                {dropHint?.slot === slot && dropHint.index === blocks.length ? (
                  <div className="h-1 rounded bg-teal-500" />
                ) : null}
              </ul>
            )}
          </div>
        );
      })}

      {selected && selectedBlock ? (
        <div className="space-y-3">
          <BlockPropsEditor
            block={selectedBlock}
            blockType={selectedType}
            onChange={(props) =>
              update(
                updateBlockProps(document, selected.slot, selected.blockId, props, {
                  merge: false,
                }),
              )
            }
          />
          <BlockCallEditor
            call={selectedBlock.call}
            capabilities={capabilities}
            onChange={(call) =>
              update(updateBlockCall(document, selected.slot, selected.blockId, call))
            }
          />
        </div>
      ) : (
        <p className="text-xs text-slate-500">Select a block to edit its props and call.</p>
      )}
    </div>
  );
}
