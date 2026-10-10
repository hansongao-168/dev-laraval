'use client'

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { BREAKPOINTS, type DeviceClass } from '@erp/config'

interface DeviceContextValue {
  deviceClass: DeviceClass
  isTouch: boolean
  orientation: 'portrait' | 'landscape'
}

const DeviceContext = createContext<DeviceContextValue | null>(null)

function readBreakpointClass(): DeviceClass {
  if (typeof window === 'undefined') {
    return 'desktop'
  }

  if (window.matchMedia(`(max-width: ${BREAKPOINTS.mobileMax}px)`).matches) {
    return 'mobile'
  }

  if (window.matchMedia(`(max-width: ${BREAKPOINTS.tabletMax}px)`).matches) {
    return 'tablet'
  }

  return 'desktop'
}

function readIsTouch(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false
  }

  return navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches
}

function readOrientation(): 'portrait' | 'landscape' {
  if (typeof window === 'undefined') {
    return 'landscape'
  }

  return window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape'
}

export function DeviceProvider({
  children,
  initialDeviceClass = 'desktop',
}: {
  children: ReactNode
  initialDeviceClass?: DeviceClass
}) {
  const [deviceClass, setDeviceClass] = useState<DeviceClass>(initialDeviceClass)
  const [isTouch, setIsTouch] = useState(false)
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape')

  useEffect(() => {
    const sync = (): void => {
      setDeviceClass(readBreakpointClass())
      setIsTouch(readIsTouch())
      setOrientation(readOrientation())
    }

    sync()
    window.addEventListener('resize', sync)

    return () => {
      window.removeEventListener('resize', sync)
    }
  }, [])

  const value = useMemo(
    () => ({ deviceClass, isTouch, orientation }),
    [deviceClass, isTouch, orientation],
  )

  return createElement(DeviceContext.Provider, { value }, children)
}

function useDeviceContext(): DeviceContextValue {
  const value = useContext(DeviceContext)

  if (value === null) {
    throw new Error('useDeviceClass must be used within DeviceProvider')
  }

  return value
}

export function useDeviceClass(): DeviceClass {
  return useDeviceContext().deviceClass
}

export function useBreakpoint(): DeviceClass {
  return useDeviceClass()
}

export function useIsTouch(): boolean {
  return useDeviceContext().isTouch
}

export function useOrientation(): 'portrait' | 'landscape' {
  return useDeviceContext().orientation
}

export function DeviceGate({
  allow,
  children,
}: {
  allow: DeviceClass[]
  children: ReactNode
}) {
  const deviceClass = useDeviceClass()

  if (!allow.includes(deviceClass)) {
    return null
  }

  return children
}
