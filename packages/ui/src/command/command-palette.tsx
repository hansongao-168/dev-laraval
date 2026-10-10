'use client'

import { Command } from 'cmdk'
import { useEffect, type KeyboardEvent } from 'react'
import type { CommandItem } from './to-commands'

export type { CommandItem } from './to-commands'
export { commandsVisibleOnDevice, labelFromKey, navItemsToCommands } from './to-commands'

export function CommandPalette({
  open,
  onOpenChange,
  items,
  extraItems = [],
  placement = 'dialog',
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: CommandItem[]
  extraItems?: CommandItem[]
  placement: 'dialog' | 'sheet'
  onSelect: (item: CommandItem) => void
}) {
  const entries = [...items, ...extraItems]

  useEffect(() => {
    if (!open) {
      return
    }

    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onOpenChange(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onOpenChange])

  if (!open) {
    return null
  }

  const panelClass =
    placement === 'sheet'
      ? 'absolute inset-x-0 bottom-0 max-h-[70vh] rounded-t-2xl border border-slate-200 bg-white p-3 shadow-xl'
      : 'absolute inset-x-4 top-[15vh] mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-2 shadow-xl sm:inset-x-auto'

  return (
    <div
      className="fixed inset-0 z-50"
      data-command-palette=""
      data-placement={placement}
    >
      <button
        type="button"
        aria-label="Close command palette"
        className="absolute inset-0 bg-slate-950/40"
        onClick={() => onOpenChange(false)}
      />
      <div className={panelClass} role="dialog" aria-modal="true" aria-label="Command palette">
        <Command label="Command palette" className="flex flex-col gap-2">
          <Command.Input
            autoFocus
            placeholder="Search navigation"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                onOpenChange(false)
              }
            }}
          />
          <Command.List className="max-h-72 overflow-y-auto">
            <Command.Empty className="px-3 py-6 text-center text-sm text-slate-500">
              No matching destinations.
            </Command.Empty>
            <Command.Group>
              {entries.map((item) => (
                <Command.Item
                  key={item.id}
                  value={`${item.label} ${item.path} ${item.id}`}
                  className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm data-[selected=true]:bg-slate-100"
                  onSelect={() => {
                    onSelect(item)
                    onOpenChange(false)
                  }}
                >
                  <span>{item.label}</span>
                  <span className="text-xs text-slate-400">{item.path}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  )
}
