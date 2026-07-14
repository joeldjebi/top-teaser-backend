import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { db } from '../../database/mysql.js'
import type {
  LandingChannel,
  LandingContactSettings,
  LandingContent,
  LandingPageRecord,
  LandingPricingPackage,
  LandingSection,
  LandingSectionItem,
} from './landing.types.js'

type LandingPageRow = RowDataPacket & {
  id: number
  slug: string
  title: string
  seo_title: string | null
  seo_description: string | null
  brand_name: string
  slogan: string | null
  baseline: string | null
  is_published: number
}

type LandingSectionRow = RowDataPacket & {
  id: number
  section_key: string
  eyebrow: string | null
  title: string
  subtitle: string | null
  body: string | null
  cta_label: string | null
  cta_href: string | null
  secondary_cta_label: string | null
  secondary_cta_href: string | null
  metadata_json: string | Record<string, unknown> | null
  sort_order: number
  is_enabled: number
}

type LandingSectionItemRow = RowDataPacket & {
  id: number
  section_id: number
  item_key: string | null
  title: string
  subtitle: string | null
  description: string | null
  icon: string | null
  badge: string | null
  item_value: string | null
  href: string | null
  metadata_json: string | Record<string, unknown> | null
  sort_order: number
  is_highlighted: number
  is_enabled: number
}

type LandingChannelRow = RowDataPacket & {
  id: number
  family_key: string
  family_label: string
  channel_name: string
  description: string
  advantage: string
  sort_order: number
  is_enabled: number
}

type LandingPricingRow = RowDataPacket & {
  id: number
  name: string
  price: string
  price_suffix: string | null
  badge: string | null
  description: string | null
  features_json: string | string[] | null
  cta_label: string | null
  cta_href: string | null
  sort_order: number
  is_popular: number
  is_enabled: number
}

type LandingContactRow = RowDataPacket & {
  phone: string | null
  whatsapp: string | null
  email: string | null
  address: string | null
  opening_hours: string | null
  form_recipient: string | null
  metadata_json: string | Record<string, unknown> | null
}

type SqlValue = string | number | null

const editablePageFields = {
  title: 'title',
  seoTitle: 'seo_title',
  seoDescription: 'seo_description',
  brandName: 'brand_name',
  slogan: 'slogan',
  baseline: 'baseline',
  isPublished: 'is_published',
} as const

const editableSectionFields = {
  eyebrow: 'eyebrow',
  title: 'title',
  subtitle: 'subtitle',
  body: 'body',
  ctaLabel: 'cta_label',
  ctaHref: 'cta_href',
  secondaryCtaLabel: 'secondary_cta_label',
  secondaryCtaHref: 'secondary_cta_href',
  metadata: 'metadata_json',
  sortOrder: 'sort_order',
  isEnabled: 'is_enabled',
} as const

const editableItemFields = {
  itemKey: 'item_key',
  title: 'title',
  subtitle: 'subtitle',
  description: 'description',
  icon: 'icon',
  badge: 'badge',
  value: 'item_value',
  href: 'href',
  metadata: 'metadata_json',
  sortOrder: 'sort_order',
  isHighlighted: 'is_highlighted',
  isEnabled: 'is_enabled',
} as const

const editableChannelFields = {
  familyKey: 'family_key',
  familyLabel: 'family_label',
  channelName: 'channel_name',
  description: 'description',
  advantage: 'advantage',
  sortOrder: 'sort_order',
  isEnabled: 'is_enabled',
} as const

const editablePricingFields = {
  name: 'name',
  price: 'price',
  priceSuffix: 'price_suffix',
  badge: 'badge',
  description: 'description',
  features: 'features_json',
  ctaLabel: 'cta_label',
  ctaHref: 'cta_href',
  sortOrder: 'sort_order',
  isPopular: 'is_popular',
  isEnabled: 'is_enabled',
} as const

const editableContactFields = {
  phone: 'phone',
  whatsapp: 'whatsapp',
  email: 'email',
  address: 'address',
  openingHours: 'opening_hours',
  formRecipient: 'form_recipient',
  metadata: 'metadata_json',
} as const

function parseJson<T>(value: string | T | null, fallback: T): T {
  if (!value) {
    return fallback
  }

  if (typeof value === 'string') {
    return JSON.parse(value) as T
  }

  return value
}

function normalizeValue(key: string, value: unknown): SqlValue {
  if (key === 'metadata' || key === 'features') {
    return value === undefined || value === null ? null : JSON.stringify(value)
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }

  return value === undefined || value === null ? null : String(value)
}

function buildUpdate(input: Record<string, unknown>, fields: Record<string, string>) {
  const sets: string[] = []
  const values: SqlValue[] = []

  for (const [key, column] of Object.entries(fields)) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      sets.push(`${column} = ?`)
      values.push(normalizeValue(key, input[key]))
    }
  }

  return { sets, values }
}

function mapPage(row: LandingPageRow): LandingPageRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    brandName: row.brand_name,
    slogan: row.slogan,
    baseline: row.baseline,
    isPublished: Boolean(row.is_published),
  }
}

function mapSection(row: LandingSectionRow): LandingSection {
  return {
    id: row.id,
    sectionKey: row.section_key,
    eyebrow: row.eyebrow,
    title: row.title,
    subtitle: row.subtitle,
    body: row.body,
    ctaLabel: row.cta_label,
    ctaHref: row.cta_href,
    secondaryCtaLabel: row.secondary_cta_label,
    secondaryCtaHref: row.secondary_cta_href,
    metadata: parseJson<Record<string, unknown> | null>(row.metadata_json, null),
    sortOrder: row.sort_order,
    isEnabled: Boolean(row.is_enabled),
    items: [],
  }
}

function mapSectionItem(row: LandingSectionItemRow): LandingSectionItem {
  return {
    id: row.id,
    sectionId: row.section_id,
    itemKey: row.item_key,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    icon: row.icon,
    badge: row.badge,
    value: row.item_value,
    href: row.href,
    metadata: parseJson<Record<string, unknown> | null>(row.metadata_json, null),
    sortOrder: row.sort_order,
    isHighlighted: Boolean(row.is_highlighted),
    isEnabled: Boolean(row.is_enabled),
  }
}

function mapChannel(row: LandingChannelRow): LandingChannel {
  return {
    id: row.id,
    familyKey: row.family_key,
    familyLabel: row.family_label,
    channelName: row.channel_name,
    description: row.description,
    advantage: row.advantage,
    sortOrder: row.sort_order,
    isEnabled: Boolean(row.is_enabled),
  }
}

function mapPricing(row: LandingPricingRow): LandingPricingPackage {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    priceSuffix: row.price_suffix,
    badge: row.badge,
    description: row.description,
    features: parseJson<string[]>(row.features_json, []),
    ctaLabel: row.cta_label,
    ctaHref: row.cta_href,
    sortOrder: row.sort_order,
    isPopular: Boolean(row.is_popular),
    isEnabled: Boolean(row.is_enabled),
  }
}

function mapContact(row: LandingContactRow): LandingContactSettings {
  return {
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    address: row.address,
    openingHours: row.opening_hours,
    formRecipient: row.form_recipient,
    metadata: parseJson<Record<string, unknown> | null>(row.metadata_json, null),
  }
}

async function findLandingPage(slug = 'home') {
  const [rows] = await db.execute<LandingPageRow[]>(
    `SELECT id, slug, title, seo_title, seo_description, brand_name, slogan,
            baseline, is_published
     FROM landing_pages
     WHERE slug = ?
     LIMIT 1`,
    [slug],
  )

  return rows[0] ? mapPage(rows[0]) : null
}

async function getPageId(slug = 'home') {
  const page = await findLandingPage(slug)
  return page?.id ?? null
}

export async function getLandingContent(slug = 'home'): Promise<LandingContent | null> {
  const page = await findLandingPage(slug)

  if (!page) {
    return null
  }

  const [sectionRows] = await db.execute<LandingSectionRow[]>(
    `SELECT id, section_key, eyebrow, title, subtitle, body, cta_label, cta_href,
            secondary_cta_label, secondary_cta_href, metadata_json, sort_order,
            is_enabled
     FROM landing_sections
     WHERE page_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [page.id],
  )
  const sections = sectionRows.map(mapSection)
  const sectionIds = sections.map((section) => section.id)

  if (sectionIds.length > 0) {
    const [itemRows] = await db.query<LandingSectionItemRow[]>(
      `SELECT id, section_id, item_key, title, subtitle, description, icon, badge,
              item_value, href, metadata_json, sort_order, is_highlighted, is_enabled
       FROM landing_section_items
       WHERE section_id IN (?)
       ORDER BY sort_order ASC, id ASC`,
      [sectionIds],
    )

    const itemsBySection = new Map<number, LandingSectionItem[]>()

    for (const row of itemRows) {
      const item = mapSectionItem(row)
      itemsBySection.set(item.sectionId, [
        ...(itemsBySection.get(item.sectionId) ?? []),
        item,
      ])
    }

    for (const section of sections) {
      section.items = itemsBySection.get(section.id) ?? []
    }
  }

  const [channelRows] = await db.execute<LandingChannelRow[]>(
    `SELECT id, family_key, family_label, channel_name, description, advantage,
            sort_order, is_enabled
     FROM landing_channels
     WHERE page_id = ?
     ORDER BY family_key ASC, sort_order ASC, id ASC`,
    [page.id],
  )
  const channels = channelRows.map(mapChannel)
  const channelFamilies = Array.from(
    channels.reduce((families, channel) => {
      const current = families.get(channel.familyKey) ?? {
        key: channel.familyKey,
        label: channel.familyLabel,
        items: [],
      }
      current.items.push(channel)
      families.set(channel.familyKey, current)
      return families
    }, new Map<string, { key: string; label: string; items: LandingChannel[] }>()),
  ).map(([, family]) => family)

  const [pricingRows] = await db.execute<LandingPricingRow[]>(
    `SELECT id, name, price, price_suffix, badge, description, features_json,
            cta_label, cta_href, sort_order, is_popular, is_enabled
     FROM landing_pricing_packages
     WHERE page_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [page.id],
  )

  const [contactRows] = await db.execute<LandingContactRow[]>(
    `SELECT phone, whatsapp, email, address, opening_hours, form_recipient,
            metadata_json
     FROM landing_contact_settings
     WHERE page_id = ?
     LIMIT 1`,
    [page.id],
  )

  return {
    page,
    sections,
    channels: { families: channelFamilies },
    pricingPackages: pricingRows.map(mapPricing),
    contact: contactRows[0] ? mapContact(contactRows[0]) : null,
  }
}

export async function updateLandingPage(input: Record<string, unknown>) {
  const pageId = await getPageId()

  if (!pageId) {
    return null
  }

  const { sets, values } = buildUpdate(input, editablePageFields)
  await db.execute(`UPDATE landing_pages SET ${sets.join(', ')} WHERE id = ?`, [
    ...values,
    pageId,
  ])

  return getLandingContent()
}

export async function updateLandingSection(
  sectionKey: string,
  input: Record<string, unknown>,
) {
  const pageId = await getPageId()

  if (!pageId) {
    return null
  }

  const { sets, values } = buildUpdate(input, editableSectionFields)
  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE landing_sections SET ${sets.join(', ')}
     WHERE page_id = ? AND section_key = ?`,
    [...values, pageId, sectionKey],
  )

  return result.affectedRows > 0 ? getLandingContent() : null
}

async function getSectionId(sectionKey: string) {
  const pageId = await getPageId()

  if (!pageId) {
    return null
  }

  const [rows] = await db.execute<Array<RowDataPacket & { id: number }>>(
    `SELECT id FROM landing_sections WHERE page_id = ? AND section_key = ? LIMIT 1`,
    [pageId, sectionKey],
  )

  return rows[0]?.id ?? null
}

export async function createLandingSectionItem(
  sectionKey: string,
  input: Record<string, unknown>,
) {
  const sectionId = await getSectionId(sectionKey)

  if (!sectionId) {
    return null
  }

  const columns = Object.entries(editableItemFields)
    .filter(([key]) => Object.prototype.hasOwnProperty.call(input, key))
    .map(([, column]) => column)
  const values = Object.keys(editableItemFields)
    .filter((key) => Object.prototype.hasOwnProperty.call(input, key))
    .map((key) => normalizeValue(key, input[key]))

  await db.execute<ResultSetHeader>(
    `INSERT INTO landing_section_items (section_id, ${columns.join(', ')})
     VALUES (?, ${columns.map(() => '?').join(', ')})`,
    [sectionId, ...values],
  )

  return getLandingContent()
}

export async function updateLandingSectionItem(
  id: number,
  input: Record<string, unknown>,
) {
  const { sets, values } = buildUpdate(input, editableItemFields)
  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE landing_section_items SET ${sets.join(', ')} WHERE id = ?`,
    [...values, id],
  )

  return result.affectedRows > 0 ? getLandingContent() : null
}

export async function deleteLandingSectionItem(id: number) {
  const [result] = await db.execute<ResultSetHeader>(
    `DELETE FROM landing_section_items WHERE id = ?`,
    [id],
  )

  return result.affectedRows > 0
}

export async function createLandingChannel(input: Record<string, unknown>) {
  const pageId = await getPageId()

  if (!pageId) {
    return null
  }

  await db.execute<ResultSetHeader>(
    `INSERT INTO landing_channels (
       page_id, family_key, family_label, channel_name, description, advantage,
       sort_order, is_enabled
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      pageId,
      normalizeValue('familyKey', input.familyKey),
      normalizeValue('familyLabel', input.familyLabel),
      normalizeValue('channelName', input.channelName),
      normalizeValue('description', input.description),
      normalizeValue('advantage', input.advantage),
      normalizeValue('sortOrder', input.sortOrder ?? 0),
      input.isEnabled === false ? 0 : 1,
    ],
  )

  return getLandingContent()
}

export async function updateLandingChannel(id: number, input: Record<string, unknown>) {
  const { sets, values } = buildUpdate(input, editableChannelFields)
  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE landing_channels SET ${sets.join(', ')} WHERE id = ?`,
    [...values, id],
  )

  return result.affectedRows > 0 ? getLandingContent() : null
}

export async function deleteLandingChannel(id: number) {
  const [result] = await db.execute<ResultSetHeader>(
    `DELETE FROM landing_channels WHERE id = ?`,
    [id],
  )

  return result.affectedRows > 0
}

export async function createLandingPricingPackage(input: Record<string, unknown>) {
  const pageId = await getPageId()

  if (!pageId) {
    return null
  }

  await db.execute<ResultSetHeader>(
    `INSERT INTO landing_pricing_packages (
       page_id, name, price, price_suffix, badge, description, features_json,
       cta_label, cta_href, sort_order, is_popular, is_enabled
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      pageId,
      normalizeValue('name', input.name),
      normalizeValue('price', input.price),
      normalizeValue('priceSuffix', input.priceSuffix ?? null),
      normalizeValue('badge', input.badge ?? null),
      normalizeValue('description', input.description ?? null),
      JSON.stringify(input.features ?? []),
      normalizeValue('ctaLabel', input.ctaLabel ?? null),
      normalizeValue('ctaHref', input.ctaHref ?? null),
      normalizeValue('sortOrder', input.sortOrder ?? 0),
      input.isPopular === true ? 1 : 0,
      input.isEnabled === false ? 0 : 1,
    ],
  )

  return getLandingContent()
}

export async function updateLandingPricingPackage(
  id: number,
  input: Record<string, unknown>,
) {
  const { sets, values } = buildUpdate(input, editablePricingFields)
  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE landing_pricing_packages SET ${sets.join(', ')} WHERE id = ?`,
    [...values, id],
  )

  return result.affectedRows > 0 ? getLandingContent() : null
}

export async function deleteLandingPricingPackage(id: number) {
  const [result] = await db.execute<ResultSetHeader>(
    `DELETE FROM landing_pricing_packages WHERE id = ?`,
    [id],
  )

  return result.affectedRows > 0
}

export async function updateLandingContact(input: Record<string, unknown>) {
  const pageId = await getPageId()

  if (!pageId) {
    return null
  }

  const { sets, values } = buildUpdate(input, editableContactFields)
  const [existing] = await db.execute<Array<RowDataPacket & { id: number }>>(
    `SELECT id FROM landing_contact_settings WHERE page_id = ? LIMIT 1`,
    [pageId],
  )

  if (existing[0]) {
    await db.execute(`UPDATE landing_contact_settings SET ${sets.join(', ')} WHERE page_id = ?`, [
      ...values,
      pageId,
    ])
  } else {
    const columns = Object.entries(editableContactFields)
      .filter(([key]) => Object.prototype.hasOwnProperty.call(input, key))
      .map(([, column]) => column)
    const insertValues = Object.keys(editableContactFields)
      .filter((key) => Object.prototype.hasOwnProperty.call(input, key))
      .map((key) => normalizeValue(key, input[key]))

    await db.execute(
      `INSERT INTO landing_contact_settings (page_id, ${columns.join(', ')})
       VALUES (?, ${columns.map(() => '?').join(', ')})`,
      [pageId, ...insertValues],
    )
  }

  return getLandingContent()
}
