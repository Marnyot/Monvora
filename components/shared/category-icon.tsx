import {
  ArrowLeftRight,
  Banknote,
  BookOpen,
  Briefcase,
  Car,
  CircleEllipsis,
  FileText,
  Gamepad2,
  Gift,
  Heart,
  HeartPulse,
  Home,
  Laptop,
  MoreHorizontal,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const LUCIDE_MAP: Record<string, LucideIcon> = {
  ArrowLeftRight,
  Banknote,
  BookOpen,
  Briefcase,
  Car,
  CircleEllipsis,
  FileText,
  Gamepad2,
  Gift,
  Heart,
  HeartPulse,
  Home,
  Laptop,
  MoreHorizontal,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  UtensilsCrossed,
  'circle-ellipsis': CircleEllipsis,
}

interface CategoryIconProps {
  icon: string
  color: string
  size?: number
  className?: string
}

export function CategoryIcon({ icon, color, size = 16, className }: CategoryIconProps) {
  const LucideComponent = LUCIDE_MAP[icon]
  if (LucideComponent) {
    return (
      <LucideComponent
        className={className}
        style={{ color, width: size, height: size }}
        aria-hidden
      />
    )
  }
  if (icon && icon.length <= 4) {
    return (
      <span
        className={cn('inline-flex items-center justify-center leading-none', className)}
        style={{ fontSize: size }}
        aria-hidden
      >
        {icon}
      </span>
    )
  }
  return (
    <span
      className={cn('inline-flex items-center justify-center font-bold leading-none', className)}
      style={{ color, fontSize: Math.round(size * 0.65) }}
      aria-hidden
    >
      {(icon || '?').slice(0, 1).toUpperCase()}
    </span>
  )
}

interface CategoryIconBubbleProps extends CategoryIconProps {
  bubbleSize?: number
}

export function CategoryIconBubble({
  icon,
  color,
  size = 16,
  bubbleSize = 36,
  className,
}: CategoryIconBubbleProps) {
  return (
    <span
      className={cn('inline-flex items-center justify-center rounded-full shrink-0', className)}
      style={{
        backgroundColor: `${color}20`,
        width: bubbleSize,
        height: bubbleSize,
      }}
    >
      <CategoryIcon icon={icon} color={color} size={size} />
    </span>
  )
}
