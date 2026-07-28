export function needsMediaReplacementConfirmation(input: {
  isPublished: boolean
  currentUrl: string | null
  nextUrl: string | null
}): boolean {
  return input.isPublished
    && Boolean(input.currentUrl)
    && input.currentUrl !== input.nextUrl
}
