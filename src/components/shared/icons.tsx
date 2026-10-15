import type { ReactNode } from 'react'

/**
 * One stroke icon set (24px grid, 1.75 stroke, round joins) for every action,
 * replacing emoji whose size and alignment vary across platforms and themes.
 * List-type emoji (🛒 🍽️ 🍻) stay: they are the lists' avatars, not actions.
 */
interface IconProps {
  className?: string
}

const Icon = ({ className = 'w-5 h-5', children }: IconProps & { children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    {children}
  </svg>
)

export const PlusIcon = (p: IconProps) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>

export const CheckIcon = (p: IconProps) => <Icon {...p}><path d="M5 12.5l4.5 4.5L19 7" /></Icon>

export const ChevronLeftIcon = (p: IconProps) => <Icon {...p}><path d="M15 5l-7 7 7 7" /></Icon>

export const ChevronRightIcon = (p: IconProps) => <Icon {...p}><path d="M9 5l7 7-7 7" /></Icon>

export const CloseIcon = (p: IconProps) => <Icon {...p}><path d="M6 6l12 12M18 6L6 18" /></Icon>

export const EllipsisIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="5" cy="12" r="1.25" fill="currentColor" />
    <circle cx="12" cy="12" r="1.25" fill="currentColor" />
    <circle cx="19" cy="12" r="1.25" fill="currentColor" />
  </Icon>
)

export const PencilIcon = (p: IconProps) => (
  <Icon {...p}><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" /></Icon>
)

export const CopyIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" />
  </Icon>
)

export const TrashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" />
  </Icon>
)

export const ArchiveIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="4" rx="1" />
    <path d="M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8M10 12h4" />
  </Icon>
)

export const UnarchiveIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="4" rx="1" />
    <path d="M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8M12 17v-6M9.5 13.5L12 11l2.5 2.5" />
  </Icon>
)

export const BookmarkIcon = (p: IconProps) => <Icon {...p}><path d="M6 4h12v16l-6-4-6 4V4z" /></Icon>

export const ListIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="4.5" cy="6" r="1" fill="currentColor" />
    <circle cx="4.5" cy="12" r="1" fill="currentColor" />
    <circle cx="4.5" cy="18" r="1" fill="currentColor" />
  </Icon>
)

export const TextIcon = (p: IconProps) => <Icon {...p}><path d="M5 7V5h14v2M12 5v14M9 19h6" /></Icon>

export const OpenIcon = (p: IconProps) => <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>

export const ShareIcon = (p: IconProps) => (
  <Icon {...p}><path d="M12 15V4M8 8l4-4 4 4M5 12v6a2 2 0 002 2h10a2 2 0 002-2v-6" /></Icon>
)

export const DownloadIcon = (p: IconProps) => (
  <Icon {...p}><path d="M12 4v11M8 11l4 4 4-4M5 12v6a2 2 0 002 2h10a2 2 0 002-2v-6" /></Icon>
)

export const GlobeIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
  </Icon>
)

export const SunIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
  </Icon>
)

export const MoonIcon = (p: IconProps) => <Icon {...p}><path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" /></Icon>

export const InfoIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <circle cx="12" cy="8" r="0.75" fill="currentColor" />
  </Icon>
)

export const UsersIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 19c0-3.3 2.7-5 6-5s6 1.7 6 5M16.5 6.5a2.5 2.5 0 010 5M17 14c2.5.3 4 1.8 4 4.5" />
  </Icon>
)

export const GripIcon = (p: IconProps) => <Icon {...p}><path d="M6 8h12M6 12h12M6 16h12" /></Icon>

const CLOUD = 'M7 18a4 4 0 01-.5-7.97A6 6 0 0118 9a4.5 4.5 0 01-1 9H7z'

export const CloudIcon = (p: IconProps) => <Icon {...p}><path d={CLOUD} /></Icon>

export const CloudCheckIcon = (p: IconProps) => (
  <Icon {...p}><path d={CLOUD} /><path d="M9.5 13.5l2 2 3.5-3.5" /></Icon>
)

export const CloudOffIcon = (p: IconProps) => (
  <Icon {...p}><path d={CLOUD} /><path d="M4 4l16 16" /></Icon>
)

export const CloudAlertIcon = (p: IconProps) => (
  <Icon {...p}><path d={CLOUD} /><path d="M12 11v3M12 16.5v.01" /></Icon>
)
