'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDeviceClass } from '@erp/devices/react'
import {
  CommandPalette,
  commandsVisibleOnDevice,
  navItemsToCommands,
  useNav,
} from '@erp/ui'

export function CommandPaletteHost() {
  const router = useRouter()
  const { items } = useNav()
  const deviceClass = useDeviceClass()
  const [open, setOpen] = useState(false)
  const placement = deviceClass === 'mobile' ? 'sheet' : 'dialog'

  const commands = useMemo(() => {
    const allowed = new Set(
      commandsVisibleOnDevice(items, deviceClass).map((item) => item.id),
    )

    return navItemsToCommands(items).filter((item) => allowed.has(item.id))
  }, [deviceClass, items])

  const onSelect = useCallback(
    (item: { path: string }) => {
      router.push(item.path)
    },
    [router],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) {
        return
      }

      event.preventDefault()
      setOpen((current) => !current)
    }

    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <>
      <button
        type="button"
        data-command-trigger=""
        className="fixed right-4 bottom-24 z-40 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-md md:bottom-6"
        onClick={() => setOpen(true)}
      >
        Search
        <kbd className="ml-2 hidden rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 sm:inline">
          ⌘K
        </kbd>
      </button>
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        items={commands}
        placement={placement}
        onSelect={onSelect}
      />
    </>
  )
}
