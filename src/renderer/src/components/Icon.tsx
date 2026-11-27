import type { ReactNode } from 'react'

export type IconName =
  | 'search'
  | 'upload'
  | 'database'
  | 'filter'
  | 'close'
  | 'reset'
  | 'image'
  | 'alert'
  | 'sun'
  | 'moon'
  | 'plus'
  | 'check'
  | 'star'
  | 'deck'
  | 'settings'
  | 'arrow-left'

const PATHS: Record<IconName, ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4.5 4.5" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15.5V4" />
      <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
      <path d="M4 15.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3.5" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5.5" rx="8" ry="3" />
      <path d="M4 5.5v13c0 1.66 3.58 3 8 3s8-1.34 8-3v-13" />
      <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
    </>
  ),
  filter: (
    <>
      <path d="M4 7h9" />
      <circle cx="16.5" cy="7" r="2.5" />
      <path d="M20 17h-9" />
      <circle cx="7.5" cy="17" r="2.5" />
    </>
  ),
  close: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  reset: (
    <>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m21 15-4.5-4.5L7 20" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5" />
      <path d="M12 16.5h.01" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4m0-14.2-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </>
  ),
  moon: <path d="M20.9 13.4A9 9 0 0 1 10.6 3.1a9 9 0 1 0 10.3 10.3Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12 4 4L19 6" />,
  star: (
    <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
  ),
  deck: (
    <>
      <rect x="8" y="3" width="12" height="16" rx="2" />
      <path d="M4 7v12a4 4 0 0 0 4 4h8" />
    </>
  ),
  settings: (
    <>
      <path d="m10 3.5-.5 2.4-1.6.9-2.4-.8-2 3.5 1.8 1.6v1.8l-1.8 1.6 2 3.5 2.4-.8 1.6.9.5 2.4h4l.5-2.4 1.6-.9 2.4.8 2-3.5-1.8-1.6v-1.8l1.8-1.6-2-3.5-2.4.8-1.6-.9-.5-2.4Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'arrow-left': <path d="m12 5-7 7 7 7M5 12h14" />
}

interface IconProps {
  name: IconName
  size?: number
  className?: string
}

function Icon({ name, size = 16, className }: IconProps): React.JSX.Element {
  return (
    <svg
      className={className ? `icon ${className}` : 'icon'}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}

export default Icon
