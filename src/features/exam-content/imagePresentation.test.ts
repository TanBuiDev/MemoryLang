import { describe, expect, it } from 'vitest'
import { getImagePresentation } from './imagePresentation'

describe('getImagePresentation', () => {
  it('uses contain as the safe default for an unconfigured image', () => {
    expect(getImagePresentation({})).toEqual({ fitClass: 'object-contain', objectPosition: 'center' })
  })

  it('uses a persisted crop preset without trusting invalid metadata', () => {
    expect(getImagePresentation({ image_crop: 'top' })).toEqual({ fitClass: 'object-cover', objectPosition: 'top' })
    expect(getImagePresentation({ image_crop: 'unsafe-value' })).toEqual({ fitClass: 'object-contain', objectPosition: 'center' })
  })
})
