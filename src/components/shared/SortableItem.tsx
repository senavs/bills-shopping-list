import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { DraggableAttributes } from '@dnd-kit/core'
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities'
import type { ReactNode } from 'react'

interface SortableItemProps {
  id: string
  children: (props: {
    attributes: DraggableAttributes
    listeners: SyntheticListenerMap | undefined
    setNodeRef: (node: HTMLElement | null) => void
    style: React.CSSProperties
    isDragging: boolean
  }) => ReactNode
}

export const SortableItem = ({ id, children }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  return <>{children({ attributes, listeners, setNodeRef, style, isDragging })}</>
}
