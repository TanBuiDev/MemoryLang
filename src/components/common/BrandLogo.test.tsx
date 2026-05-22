import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BrandLogo, BrandMark } from './BrandLogo'

describe('BrandLogo', () => {
  it('renders the full MemoryLang logo with an accessible label', () => {
    render(<BrandLogo />)

    expect(screen.getByRole('img', { name: 'MemoryLang logo' })).toBeInTheDocument()
  })

  it('renders the compact logo variant', () => {
    render(<BrandLogo variant="compact" label="MemoryLang compact logo" />)

    expect(screen.getByRole('img', { name: 'MemoryLang compact logo' })).toBeInTheDocument()
  })
})

describe('BrandMark', () => {
  it('renders the MemoryLang app icon with a size class', () => {
    render(<BrandMark size="lg" label="MemoryLang app icon" />)

    expect(screen.getByRole('img', { name: 'MemoryLang app icon' })).toHaveClass('h-14')
  })
})
