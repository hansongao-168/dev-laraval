import type { DeviceClass } from './types'

export type { DeviceClass }

export const BREAKPOINTS = {
  mobileMax: 767,
  tabletMin: 768,
  tabletMax: 1279,
  desktopMin: 1280,
} as const

export function classifyViewportWidth(width: number): DeviceClass {
  if (width < BREAKPOINTS.tabletMin) {
    return 'mobile'
  }

  if (width < BREAKPOINTS.desktopMin) {
    return 'tablet'
  }

  return 'desktop'
}
