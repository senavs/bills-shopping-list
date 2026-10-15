import type { DraggableAttributes } from '@dnd-kit/core'
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities'
import type { HTMLAttributes } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import { GripIcon } from './icons'

interface DragHandleProps extends Omit<HTMLAttributes<HTMLButtonElement>, 'onPointerDown'> {
  listeners?: SyntheticListenerMap
  attributes?: DraggableAttributes
}

export const DragHandle = ({ listeners, attributes, className, ...props }: DragHandleProps) => {
  const { t } = useLanguage()
  return (
    <button
      type="button"
      className={`flex items-center justify-center w-11 h-11 shrink-0 cursor-grab active:cursor-grabbing text-muted touch-none rounded-lg ${className || ''}`}
      aria-label={t.dragToReorder}
      {...attributes}
      {...listeners}
      {...props}
    >
      <GripIcon />
    </button>
  )
}
