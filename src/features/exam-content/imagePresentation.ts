export const IMAGE_CROP_OPTIONS = [
  { value: 'contain', label: 'Hiển thị toàn bộ ảnh' },
  { value: 'center', label: 'Cắt giữa ảnh' },
  { value: 'top', label: 'Ưu tiên phần trên' },
  { value: 'bottom', label: 'Ưu tiên phần dưới' },
  { value: 'left', label: 'Ưu tiên bên trái' },
  { value: 'right', label: 'Ưu tiên bên phải' },
] as const

export type ImageCropPreset = (typeof IMAGE_CROP_OPTIONS)[number]['value']

const cropPresets = new Set<ImageCropPreset>(IMAGE_CROP_OPTIONS.map((option) => option.value))

export function getImagePresentation(metadata: Record<string, unknown> | null | undefined) {
  const crop = typeof metadata?.image_crop === 'string' ? metadata.image_crop : 'contain'
  if (!cropPresets.has(crop as ImageCropPreset) || crop === 'contain') {
    return { fitClass: 'object-contain', objectPosition: 'center' }
  }
  return { fitClass: 'object-cover', objectPosition: crop }
}
