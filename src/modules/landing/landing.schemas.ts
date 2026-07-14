import { z } from 'zod'

export const landingIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const landingSectionKeyParamSchema = z.object({
  sectionKey: z.string().trim().min(1).max(80),
})

const metadataSchema = z.record(z.string(), z.unknown()).nullable().optional()

export const updateLandingPageSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    seoTitle: z.string().trim().max(190).nullable().optional(),
    seoDescription: z.string().trim().max(320).nullable().optional(),
    brandName: z.string().trim().min(1).max(120).optional(),
    slogan: z.string().trim().max(190).nullable().optional(),
    baseline: z.string().trim().max(320).nullable().optional(),
    isPublished: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required.',
  })

export const updateLandingSectionSchema = z
  .object({
    eyebrow: z.string().trim().max(160).nullable().optional(),
    title: z.string().trim().min(1).max(190).optional(),
    subtitle: z.string().trim().max(500).nullable().optional(),
    body: z.string().trim().max(2000).nullable().optional(),
    ctaLabel: z.string().trim().max(120).nullable().optional(),
    ctaHref: z.string().trim().max(255).nullable().optional(),
    secondaryCtaLabel: z.string().trim().max(120).nullable().optional(),
    secondaryCtaHref: z.string().trim().max(255).nullable().optional(),
    metadata: metadataSchema,
    sortOrder: z.number().int().min(0).optional(),
    isEnabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required.',
  })

const sectionItemBaseSchema = z.object({
  itemKey: z.string().trim().max(80).nullable().optional(),
  title: z.string().trim().min(1).max(190),
  subtitle: z.string().trim().max(255).nullable().optional(),
  description: z.string().trim().max(1200).nullable().optional(),
  icon: z.string().trim().max(80).nullable().optional(),
  badge: z.string().trim().max(80).nullable().optional(),
  value: z.string().trim().max(255).nullable().optional(),
  href: z.string().trim().max(255).nullable().optional(),
  metadata: metadataSchema,
  sortOrder: z.number().int().min(0).optional(),
  isHighlighted: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
})

export const createLandingSectionItemSchema = sectionItemBaseSchema
export const updateLandingSectionItemSchema = sectionItemBaseSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one field is required.' },
)

const channelBaseSchema = z.object({
  familyKey: z.string().trim().min(1).max(80),
  familyLabel: z.string().trim().min(1).max(120),
  channelName: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(600),
  advantage: z.string().trim().min(1).max(600),
  sortOrder: z.number().int().min(0).optional(),
  isEnabled: z.boolean().optional(),
})

export const createLandingChannelSchema = channelBaseSchema
export const updateLandingChannelSchema = channelBaseSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one field is required.' },
)

const pricingBaseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  price: z.string().trim().min(1).max(80),
  priceSuffix: z.string().trim().max(80).nullable().optional(),
  badge: z.string().trim().max(80).nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  features: z.array(z.string().trim().min(1).max(240)).default([]),
  ctaLabel: z.string().trim().max(120).nullable().optional(),
  ctaHref: z.string().trim().max(255).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isPopular: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
})

export const createLandingPricingPackageSchema = pricingBaseSchema
export const updateLandingPricingPackageSchema = pricingBaseSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one field is required.' },
)

export const updateLandingContactSchema = z
  .object({
    phone: z.string().trim().max(80).nullable().optional(),
    whatsapp: z.string().trim().max(80).nullable().optional(),
    email: z.string().trim().email().max(190).nullable().optional(),
    address: z.string().trim().max(255).nullable().optional(),
    openingHours: z.string().trim().max(160).nullable().optional(),
    formRecipient: z.string().trim().email().max(190).nullable().optional(),
    metadata: metadataSchema,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required.',
  })
