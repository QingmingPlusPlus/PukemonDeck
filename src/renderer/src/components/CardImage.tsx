import { useState, type ReactNode } from 'react'

interface CardImageProps {
  src: string | null
  alt: string
  className: string
  fallback: ReactNode
  eager?: boolean
}

function CardImage({
  src,
  alt,
  className,
  fallback,
  eager = false
}: CardImageProps): React.JSX.Element {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (!src || failedSrc === src) return <>{fallback}</>

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      onError={() => setFailedSrc(src)}
    />
  )
}

export default CardImage
