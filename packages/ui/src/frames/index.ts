import type { ComponentType, ReactNode } from 'react'
import type { FrameId } from '@erp/config'
import { AuthFrame } from '../shells/auth'
import { DetailFrame, EmptyFrame, ListFrame, WorkspaceFrame } from './frames'

type FrameComponent = ComponentType<{
  children: ReactNode
  title?: string
  description?: string
  toolbar?: ReactNode
}>

const frames: Record<FrameId, FrameComponent> = {
  list: ListFrame,
  detail: DetailFrame,
  auth: AuthFrame,
  workspace: WorkspaceFrame,
  empty: EmptyFrame,
}

export function getFrame(frameId: FrameId): FrameComponent {
  return frames[frameId] ?? EmptyFrame
}

export { DetailFrame, EmptyFrame, ListFrame, WorkspaceFrame }
