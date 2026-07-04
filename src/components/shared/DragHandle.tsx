import type { HTMLAttributes } from 'react'

interface DragHandleProps extends HTMLAttributes<HTMLButtonElement> {
  listeners?: Record<string, unknown>
  attributes?: Record<string, unknown>
}

export const DragHandle = ({ listeners, attributes, ...props }: DragHandleProps) => {
  return (
    <button
      type="button"
      className="flex items-center justify-center w-10 h-10 min-w-[40px] cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 touch-none rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      aria-label="Drag to reorder"
      {...attributes}
      {...listeners}
      {...props}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <circle cx="7" cy="4" r="1.5" />
        <circle cx="13" cy="4" r="1.5" />
        <circle cx="7" cy="10" r="1.5" />
        <circle cx="13" cy="10" r="1.5" />
        <circle cx="7" cy="16" r="1.5" />
        <circle cx="13" cy="16" r="1.5" />
      </svg>
    </button>
  )
}
