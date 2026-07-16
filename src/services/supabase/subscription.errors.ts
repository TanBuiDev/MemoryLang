export type SubscriptionLimitedFeature = 'terms' | 'decks'

export class SubscriptionLimitError extends Error {
  public readonly feature: SubscriptionLimitedFeature
  public readonly limit: number

  constructor(
    feature: SubscriptionLimitedFeature,
    limit: number,
  ) {
    super(`Free plan ${feature} limit reached (${limit})`)
    this.name = 'SubscriptionLimitError'
    this.feature = feature
    this.limit = limit
  }
}

export function isSubscriptionLimitError(error: unknown): error is SubscriptionLimitError {
  return error instanceof SubscriptionLimitError
}
