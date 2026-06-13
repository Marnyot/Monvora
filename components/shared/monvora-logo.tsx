import Image from 'next/image'
import { cn } from '@/lib/utils'

interface MonvoraLogoProps {
  size?: number
  className?: string
  priority?: boolean
}

export function MonvoraLogo({ size = 32, className, priority = false }: MonvoraLogoProps) {
  return (
    <Image
      src="/icons/icon-192.png"
      alt="Monvora"
      width={size}
      height={size}
      priority={priority}
      className={cn('object-contain', className)}
    />
  )
}
