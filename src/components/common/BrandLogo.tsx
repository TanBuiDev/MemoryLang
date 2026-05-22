import primaryLogo from '@/assets/brand/memorylang-primary-logo.svg'
import compactLogo from '@/assets/brand/memorylang-compact-logo.svg'
import iconOnly from '@/assets/brand/memorylang-icon-only.svg'
import wordmark from '@/assets/brand/memorylang-wordmark.svg'
import { cn } from '@/utils/cn'

type BrandLogoVariant = 'primary' | 'compact' | 'wordmark'
type BrandLogoSize = 'sm' | 'md' | 'lg'
type BrandMarkSize = 'sm' | 'md' | 'lg' | 'xl'

const logoSources: Record<BrandLogoVariant, string> = {
  primary: primaryLogo,
  compact: compactLogo,
  wordmark,
}

const logoSizes: Record<BrandLogoSize, string> = {
  sm: 'h-8 w-auto',
  md: 'h-10 w-auto',
  lg: 'h-14 w-auto',
}

const markSizes: Record<BrandMarkSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
  xl: 'h-24 w-24',
}

interface BrandLogoProps {
  variant?: BrandLogoVariant
  size?: BrandLogoSize
  label?: string
  className?: string
}

export function BrandLogo({
  variant = 'primary',
  size = 'md',
  label = 'MemoryLang logo',
  className,
}: BrandLogoProps) {
  return (
    <img
      src={logoSources[variant]}
      alt={label}
      className={cn('block object-contain object-left', logoSizes[size], className)}
    />
  )
}

interface BrandMarkProps {
  size?: BrandMarkSize
  label?: string
  className?: string
}

export function BrandMark({ size = 'md', label = 'MemoryLang app icon', className }: BrandMarkProps) {
  return (
    <img
      src={iconOnly}
      alt={label}
      className={cn('block shrink-0 object-contain', markSizes[size], className)}
    />
  )
}
