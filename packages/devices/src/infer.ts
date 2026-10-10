import { classifyViewportWidth, type DeviceClass } from '@erp/config/breakpoints'

export function inferInitialDeviceClass(input: {
  viewportWidthHeader: string | null
  userAgent: string | null
}): DeviceClass {
  const parsedWidth = Number(input.viewportWidthHeader)

  if (Number.isFinite(parsedWidth) && parsedWidth > 0) {
    return classifyViewportWidth(parsedWidth)
  }

  const userAgent = input.userAgent ?? ''

  if (/iPad|Tablet/i.test(userAgent)) {
    return 'tablet'
  }

  if (/Mobi|Android|iPhone|iPod/i.test(userAgent)) {
    return 'mobile'
  }

  return 'desktop'
}
