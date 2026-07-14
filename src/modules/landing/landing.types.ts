export type LandingPageRecord = {
  id: number
  slug: string
  title: string
  seoTitle: string | null
  seoDescription: string | null
  brandName: string
  slogan: string | null
  baseline: string | null
  isPublished: boolean
}

export type LandingSection = {
  id: number
  sectionKey: string
  eyebrow: string | null
  title: string
  subtitle: string | null
  body: string | null
  ctaLabel: string | null
  ctaHref: string | null
  secondaryCtaLabel: string | null
  secondaryCtaHref: string | null
  metadata: Record<string, unknown> | null
  sortOrder: number
  isEnabled: boolean
  items: LandingSectionItem[]
}

export type LandingSectionItem = {
  id: number
  sectionId: number
  itemKey: string | null
  title: string
  subtitle: string | null
  description: string | null
  icon: string | null
  badge: string | null
  value: string | null
  href: string | null
  metadata: Record<string, unknown> | null
  sortOrder: number
  isHighlighted: boolean
  isEnabled: boolean
}

export type LandingChannel = {
  id: number
  familyKey: string
  familyLabel: string
  channelName: string
  description: string
  advantage: string
  sortOrder: number
  isEnabled: boolean
}

export type LandingPricingPackage = {
  id: number
  name: string
  price: string
  priceSuffix: string | null
  badge: string | null
  description: string | null
  features: string[]
  ctaLabel: string | null
  ctaHref: string | null
  sortOrder: number
  isPopular: boolean
  isEnabled: boolean
}

export type LandingContactSettings = {
  phone: string | null
  whatsapp: string | null
  email: string | null
  address: string | null
  openingHours: string | null
  formRecipient: string | null
  metadata: Record<string, unknown> | null
}

export type LandingContent = {
  page: LandingPageRecord
  sections: LandingSection[]
  channels: {
    families: Array<{
      key: string
      label: string
      items: LandingChannel[]
    }>
  }
  pricingPackages: LandingPricingPackage[]
  contact: LandingContactSettings | null
}
