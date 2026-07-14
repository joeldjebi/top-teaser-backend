import { db } from '../database/mysql.js'
import type { RowDataPacket } from 'mysql2'

type IdRow = RowDataPacket & { id: number }

type SectionSeed = {
  key: string
  eyebrow?: string
  title: string
  subtitle?: string
  body?: string
  ctaLabel?: string
  ctaHref?: string
  secondaryCtaLabel?: string
  secondaryCtaHref?: string
  metadata?: Record<string, unknown>
  sortOrder: number
}

type ItemSeed = {
  sectionKey: string
  itemKey: string
  title: string
  subtitle?: string
  description?: string
  icon?: string
  badge?: string
  value?: string
  href?: string
  metadata?: Record<string, unknown>
  sortOrder: number
  isHighlighted?: boolean
}

const sections: SectionSeed[] = [
  {
    key: 'hero',
    eyebrow: "La référence communication · Côte d'Ivoire",
    title: 'Donnez de la voix à votre marque.',
    subtitle: 'Exposez. Valorisez. Développez.',
    body:
      "TOP TEASER aide les entreprises, commerces, institutions et porteurs de projets à diffuser leurs annonces sur les bons canaux, avec une production professionnelle et un suivi clair.",
    ctaLabel: 'Lancer ma campagne',
    ctaHref: '#contact',
    secondaryCtaLabel: 'Découvrir nos canaux',
    secondaryCtaHref: '#canaux',
    sortOrder: 10,
  },
  {
    key: 'why',
    eyebrow: 'Pourquoi TOP TEASER',
    title: 'Une régie, tous vos canaux',
    subtitle:
      'Un partenaire unique pour piloter votre communication multicanal avec méthode, créativité et visibilité terrain.',
    sortOrder: 20,
  },
  {
    key: 'channels',
    eyebrow: 'Nos canaux de diffusion',
    title: 'Touchez votre audience là où elle agit',
    subtitle:
      'Choisissez une famille de canaux et construisons le dispositif adapté à votre objectif.',
    sortOrder: 30,
  },
  {
    key: 'production',
    eyebrow: 'Production de contenus',
    title: 'On crée ce qui fait la différence',
    subtitle:
      'Des supports cohérents, professionnels et prêts à être diffusés sur chaque canal.',
    sortOrder: 40,
  },
  {
    key: 'pricing',
    eyebrow: 'Packages / Tarifs',
    title: 'Choisissez votre ambition',
    subtitle:
      "Des offres claires pour démarrer vite, accélérer votre visibilité ou piloter un dispositif 360°.",
    body: "Achat d'espace média facturé en sus. Montants en FCFA HT.",
    sortOrder: 50,
  },
  {
    key: 'method',
    eyebrow: 'Méthode',
    title: 'Du contact à la performance',
    subtitle:
      'Une progression simple pour cadrer, produire, diffuser et mesurer sans dispersion.',
    sortOrder: 60,
  },
  {
    key: 'cta',
    title: "Votre marque mérite d'être vue",
    body:
      'Parlez-nous de votre besoin. Nous vous aidons à choisir le bon package et les canaux les plus efficaces.',
    ctaLabel: 'Demander un devis gratuit',
    ctaHref: '#contact',
    secondaryCtaLabel: 'Comparer les packages',
    secondaryCtaHref: '#tarifs',
    sortOrder: 70,
  },
  {
    key: 'contact',
    eyebrow: 'Contact',
    title: 'Travaillons ensemble',
    subtitle:
      'Indiquez votre projet, votre package cible et vos coordonnées. Notre équipe revient vers vous rapidement.',
    sortOrder: 80,
  },
  {
    key: 'footer',
    title: 'TOP TEASER',
    body:
      "La régie de communication multicanal éditée par BWAN TECHNOLOGIES, basée à Abidjan, Côte d'Ivoire.",
    sortOrder: 90,
  },
]

const items: ItemSeed[] = [
  { sectionKey: 'hero', itemKey: 'channel-families', title: '4', subtitle: 'familles de canaux', sortOrder: 10 },
  { sectionKey: 'hero', itemKey: 'channels-count', title: '20+', subtitle: 'canaux activables', sortOrder: 20 },
  { sectionKey: 'hero', itemKey: 'one-stop-shop', title: '1', subtitle: 'guichet unique', sortOrder: 30 },
  { sectionKey: 'why', itemKey: 'unique', title: 'Guichet unique', description: 'Un seul interlocuteur pour coordonner vos canaux, contenus, budgets et reportings.', icon: 'LayoutDashboard', sortOrder: 10 },
  { sectionKey: 'why', itemKey: 'coverage', title: 'Couverture 360°', description: 'Digital, terrain, médias et partenariats réunis dans un même dispositif.', icon: 'Radar', sortOrder: 20 },
  { sectionKey: 'why', itemKey: 'local', title: 'Ancrage local', description: "Une approche adaptée au marché ivoirien, aux communes et aux habitudes d'achat.", icon: 'MapPin', sortOrder: 30 },
  { sectionKey: 'why', itemKey: 'production', title: 'Production intégrée', description: 'Visuels, vidéos, audios, textes et planning produits avec cohérence.', icon: 'Clapperboard', sortOrder: 40 },
  { sectionKey: 'why', itemKey: 'transparent', title: 'Tarifs transparents', description: 'Des packages lisibles pour choisir rapidement selon votre ambition.', icon: 'ReceiptText', sortOrder: 50 },
  { sectionKey: 'why', itemKey: 'measured', title: 'Résultats mesurés', description: 'Un reporting clair pour suivre la diffusion, les retours et les optimisations.', icon: 'ChartNoAxesCombined', sortOrder: 60 },
  { sectionKey: 'production', itemKey: 'identity', title: 'Identité visuelle', description: 'Logo, charte, univers visuel et déclinaisons de marque.', sortOrder: 10 },
  { sectionKey: 'production', itemKey: 'graphics', title: 'Création graphique', description: 'Affiches, flyers, bannières, posts et supports publicitaires.', sortOrder: 20 },
  { sectionKey: 'production', itemKey: 'video', title: 'Production vidéo', description: 'Capsules sociales, vidéos produits, spots et interviews.', sortOrder: 30 },
  { sectionKey: 'production', itemKey: 'audio', title: 'Production audio', description: 'Spots radio, jingles, voix off et messages promotionnels.', sortOrder: 40 },
  { sectionKey: 'production', itemKey: 'copywriting', title: 'Copywriting', description: 'Messages, accroches, scripts et textes de conversion.', sortOrder: 50 },
  { sectionKey: 'production', itemKey: 'photo', title: 'Photographie produit', description: 'Photos propres, cadrées et prêtes pour supports digitaux ou print.', sortOrder: 60 },
  { sectionKey: 'production', itemKey: 'community', title: 'Community management', description: 'Animation, programmation, réponses et cohérence éditoriale.', sortOrder: 70 },
  { sectionKey: 'production', itemKey: 'strategy', title: 'Stratégie & médiaplanning', description: 'Choix des canaux, timing, budget et séquences de diffusion.', sortOrder: 80 },
  { sectionKey: 'method', itemKey: 'contact', title: 'Contact', description: 'Vous nous présentez votre besoin, vos objectifs et votre délai.', sortOrder: 10 },
  { sectionKey: 'method', itemKey: 'tarifs', title: 'Tarifs', description: 'Nous clarifions les options, contraintes et coûts médias éventuels.', sortOrder: 20 },
  { sectionKey: 'method', itemKey: 'package', title: 'Package', description: 'Vous choisissez l’offre adaptée ou un dispositif sur mesure.', sortOrder: 30 },
  { sectionKey: 'method', itemKey: 'brief', title: 'Brief', description: 'Nous cadrons message, audience, canaux, contenus et calendrier.', sortOrder: 40 },
  { sectionKey: 'method', itemKey: 'production', title: 'Production', description: 'Les assets sont créés, validés et préparés pour diffusion.', sortOrder: 50 },
  { sectionKey: 'method', itemKey: 'diffusion', title: 'Diffusion', description: 'La campagne est exécutée sur les canaux retenus.', sortOrder: 60 },
  { sectionKey: 'method', itemKey: 'reporting', title: 'Reporting', description: 'Vous recevez les résultats et recommandations d’optimisation.', sortOrder: 70 },
  { sectionKey: 'method', itemKey: 'cards', title: 'Cartes bancaires', metadata: { type: 'payment' }, sortOrder: 110 },
  { sectionKey: 'method', itemKey: 'orange-money', title: 'Orange Money', metadata: { type: 'payment' }, sortOrder: 120 },
  { sectionKey: 'method', itemKey: 'mtn-momo', title: 'MTN MoMo', metadata: { type: 'payment' }, sortOrder: 130 },
  { sectionKey: 'method', itemKey: 'moov-money', title: 'Moov Money', metadata: { type: 'payment' }, sortOrder: 140 },
  { sectionKey: 'method', itemKey: 'wave', title: 'Wave', metadata: { type: 'payment' }, sortOrder: 150 },
  { sectionKey: 'method', itemKey: 'bank', title: 'Virement', metadata: { type: 'payment' }, sortOrder: 160 },
  { sectionKey: 'method', itemKey: 'cash', title: 'Espèces', metadata: { type: 'payment' }, sortOrder: 170 },
]

const channels = [
  ['digitaux', 'Digitaux', 'Plateforme TOP TEASER', 'Publication et mise en avant d’annonces professionnelles.', 'Audience qualifiée et visibilité centralisée.'],
  ['digitaux', 'Digitaux', 'WhatsApp Business', 'Campagnes directes, relances et messages conversationnels.', 'Très fort taux de lecture.'],
  ['digitaux', 'Digitaux', 'Facebook & Instagram', 'Posts, stories, reels et campagnes publicitaires.', 'Ciblage précis et formats visuels.'],
  ['digitaux', 'Digitaux', 'TikTok', 'Vidéos courtes, tendances et contenus créatifs.', 'Portée virale et audience jeune.'],
  ['digitaux', 'Digitaux', 'LinkedIn', 'Communication B2B, recrutement et crédibilité corporate.', 'Audience professionnelle.'],
  ['digitaux', 'Digitaux', 'Google SEO/SEA', 'Référencement naturel et annonces sponsorisées.', 'Capture de demande active.'],
  ['digitaux', 'Digitaux', 'YouTube', 'Vidéos longues, shorts et publicités vidéo.', 'Impact audiovisuel durable.'],
  ['digitaux', 'Digitaux', 'E-mailing & SMS Pro', 'Diffusion ciblée vers contacts qualifiés.', 'Suivi des ouvertures et clics.'],
  ['digitaux', 'Digitaux', 'Influenceurs digitaux', 'Activation de créateurs locaux et niches sectorielles.', 'Confiance communautaire.'],
  ['terrain', 'Terrain', 'Affichage urbain', 'Panneaux, bâches, enseignes et supports visibles.', 'Présence physique forte.'],
  ['terrain', 'Terrain', 'PLV', 'Supports en points de vente.', 'Influence au moment de l’achat.'],
  ['terrain', 'Terrain', 'Flyers', 'Distribution ciblée dans les zones clés.', 'Contact direct et coût maîtrisé.'],
  ['terrain', 'Terrain', 'Street marketing', 'Animations et dispositifs de proximité.', 'Expérience mémorable.'],
  ['terrain', 'Terrain', 'Caravanes publicitaires', 'Activation mobile dans plusieurs communes.', 'Couverture terrain massive.'],
  ['terrain', 'Terrain', 'Habillage véhicules', 'Marquage et visibilité itinérante.', 'Répétition quotidienne.'],
  ['terrain', 'Terrain', 'Roadshows & salons', 'Présence événementielle et démonstrations.', 'Interaction directe avec prospects.'],
  ['medias', 'Médias', 'Radio', 'Spots, interviews et chroniques.', 'Portée locale rapide.'],
  ['medias', 'Médias', 'Télévision', 'Spots et passages sponsorisés.', 'Crédibilité et impact grand public.'],
  ['medias', 'Médias', 'Presse écrite & en ligne', 'Articles, publi-reportages et annonces.', 'Preuve éditoriale.'],
  ['medias', 'Médias', 'Cinéma & écrans publics', 'Diffusion sur écrans à forte attention.', 'Mémorisation élevée.'],
  ['medias', 'Médias', 'Web TV & radios en ligne', 'Formats digitaux audio/vidéo.', 'Audience connectée.'],
  ['partenariats', 'Partenariats', 'Écosystème BWAN', 'Activation de réseaux, produits et services partenaires.', 'Effet levier immédiat.'],
  ['partenariats', 'Partenariats', 'Partenariats événementiels', 'Présence associée à des événements ciblés.', 'Crédibilité par association.'],
  ['partenariats', 'Partenariats', 'Partenariats institutionnels', 'Relations avec structures et organisations.', 'Accès à des audiences structurées.'],
  ['partenariats', 'Partenariats', 'Réseaux commerçants & GIE', 'Diffusion via réseaux de proximité.', 'Ancrage local concret.'],
  ['partenariats', 'Partenariats', 'Co-branding', 'Campagnes communes avec marques compatibles.', 'Partage d’audience.'],
  ['partenariats', 'Partenariats', "Apporteurs d'affaires", 'Réseau de recommandation commerciale.', 'Génération d’opportunités.'],
] as const

const packages = [
  {
    name: 'Start',
    price: '100 000 FCFA',
    priceSuffix: '/mois',
    features: ['Fiche annonceur', '4 publications/mois', '1 campagne WhatsApp', '1 visuel', 'Reporting simplifié'],
    sortOrder: 10,
  },
  {
    name: 'Boost',
    price: '250 000 FCFA',
    priceSuffix: '/mois',
    badge: 'Populaire',
    features: ['Tout Start', '12 publications', 'Ads FB/Insta', '2 vidéos courtes', 'WhatsApp + SMS', 'Community management 2 pages', 'Reporting détaillé'],
    sortOrder: 20,
    isPopular: true,
  },
  {
    name: 'Premium',
    price: '450 000 FCFA',
    priceSuffix: '/mois',
    features: ['Tout Boost', 'Présence terrain', 'Spot radio', 'Vidéo pro', 'Stratégie dédiée', 'Écosystème partenaires', 'Community management 3 pages + influenceurs'],
    sortOrder: 30,
  },
  {
    name: 'Institutionnel',
    price: 'Sur devis',
    features: ['Dispositif 360°', 'Campagnes nationales', 'Caravanes', 'Partenariats institutionnels', 'Production illimitée', 'Chef de projet dédié'],
    sortOrder: 40,
  },
]

async function run() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS landing_pages (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      slug VARCHAR(80) NOT NULL,
      title VARCHAR(160) NOT NULL,
      seo_title VARCHAR(190) NULL,
      seo_description VARCHAR(320) NULL,
      brand_name VARCHAR(120) NOT NULL DEFAULT 'TOP TEASER',
      slogan VARCHAR(190) NULL,
      baseline VARCHAR(320) NULL,
      is_published TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_landing_pages_slug (slug),
      KEY idx_landing_pages_published (is_published)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS landing_sections (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      page_id BIGINT UNSIGNED NOT NULL,
      section_key VARCHAR(80) NOT NULL,
      eyebrow VARCHAR(160) NULL,
      title VARCHAR(190) NOT NULL,
      subtitle VARCHAR(500) NULL,
      body TEXT NULL,
      cta_label VARCHAR(120) NULL,
      cta_href VARCHAR(255) NULL,
      secondary_cta_label VARCHAR(120) NULL,
      secondary_cta_href VARCHAR(255) NULL,
      metadata_json JSON NULL,
      sort_order INT NOT NULL DEFAULT 0,
      is_enabled TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_landing_sections_page_key (page_id, section_key),
      KEY idx_landing_sections_order (page_id, is_enabled, sort_order),
      CONSTRAINT fk_landing_sections_page FOREIGN KEY (page_id) REFERENCES landing_pages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS landing_section_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      section_id BIGINT UNSIGNED NOT NULL,
      item_key VARCHAR(80) NULL,
      title VARCHAR(190) NOT NULL,
      subtitle VARCHAR(255) NULL,
      description TEXT NULL,
      icon VARCHAR(80) NULL,
      badge VARCHAR(80) NULL,
      item_value VARCHAR(255) NULL,
      href VARCHAR(255) NULL,
      metadata_json JSON NULL,
      sort_order INT NOT NULL DEFAULT 0,
      is_highlighted TINYINT(1) NOT NULL DEFAULT 0,
      is_enabled TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_landing_items_section_key (section_id, item_key),
      KEY idx_landing_items_order (section_id, is_enabled, sort_order),
      CONSTRAINT fk_landing_items_section FOREIGN KEY (section_id) REFERENCES landing_sections(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS landing_channels (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      page_id BIGINT UNSIGNED NOT NULL,
      family_key VARCHAR(80) NOT NULL,
      family_label VARCHAR(120) NOT NULL,
      channel_name VARCHAR(160) NOT NULL,
      description VARCHAR(600) NOT NULL,
      advantage VARCHAR(600) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      is_enabled TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_landing_channels_page_family_name (page_id, family_key, channel_name),
      KEY idx_landing_channels_family_order (page_id, family_key, is_enabled, sort_order),
      CONSTRAINT fk_landing_channels_page FOREIGN KEY (page_id) REFERENCES landing_pages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS landing_pricing_packages (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      page_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(120) NOT NULL,
      price VARCHAR(80) NOT NULL,
      price_suffix VARCHAR(80) NULL,
      badge VARCHAR(80) NULL,
      description VARCHAR(500) NULL,
      features_json JSON NULL,
      cta_label VARCHAR(120) NULL,
      cta_href VARCHAR(255) NULL,
      sort_order INT NOT NULL DEFAULT 0,
      is_popular TINYINT(1) NOT NULL DEFAULT 0,
      is_enabled TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_landing_pricing_page_name (page_id, name),
      KEY idx_landing_pricing_order (page_id, is_enabled, sort_order),
      CONSTRAINT fk_landing_pricing_page FOREIGN KEY (page_id) REFERENCES landing_pages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS landing_contact_settings (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      page_id BIGINT UNSIGNED NOT NULL,
      phone VARCHAR(80) NULL,
      whatsapp VARCHAR(80) NULL,
      email VARCHAR(190) NULL,
      address VARCHAR(255) NULL,
      opening_hours VARCHAR(160) NULL,
      form_recipient VARCHAR(190) NULL,
      metadata_json JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_landing_contact_page (page_id),
      CONSTRAINT fk_landing_contact_page FOREIGN KEY (page_id) REFERENCES landing_pages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await db.execute(
    `INSERT INTO landing_pages (
       slug, title, seo_title, seo_description, brand_name, slogan, baseline, is_published
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       seo_title = VALUES(seo_title),
       seo_description = VALUES(seo_description),
       brand_name = VALUES(brand_name),
       slogan = VALUES(slogan),
       baseline = VALUES(baseline)`,
    [
      'home',
      'TOP TEASER',
      'TOP TEASER - Régie de communication multicanal en Côte d’Ivoire',
      "La référence en Côte d'Ivoire pour la communication, la promotion et la diffusion d'annonces professionnelles, commerciales et de services.",
      'TOP TEASER',
      'Exposez. Valorisez. Développez.',
      "La référence en Côte d'Ivoire pour la communication, la promotion et la diffusion d'annonces professionnelles, commerciales et de services.",
    ],
  )

  const [pageRows] = await db.execute<IdRow[]>(
    `SELECT id FROM landing_pages WHERE slug = ? LIMIT 1`,
    ['home'],
  )
  const pageId = pageRows[0].id

  for (const section of sections) {
    await db.execute(
      `INSERT INTO landing_sections (
         page_id, section_key, eyebrow, title, subtitle, body, cta_label, cta_href,
         secondary_cta_label, secondary_cta_href, metadata_json, sort_order, is_enabled
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE
         eyebrow = VALUES(eyebrow),
         title = VALUES(title),
         subtitle = VALUES(subtitle),
         body = VALUES(body),
         cta_label = VALUES(cta_label),
         cta_href = VALUES(cta_href),
         secondary_cta_label = VALUES(secondary_cta_label),
         secondary_cta_href = VALUES(secondary_cta_href),
         metadata_json = VALUES(metadata_json),
         sort_order = VALUES(sort_order)`,
      [
        pageId,
        section.key,
        section.eyebrow ?? null,
        section.title,
        section.subtitle ?? null,
        section.body ?? null,
        section.ctaLabel ?? null,
        section.ctaHref ?? null,
        section.secondaryCtaLabel ?? null,
        section.secondaryCtaHref ?? null,
        section.metadata ? JSON.stringify(section.metadata) : null,
        section.sortOrder,
      ],
    )
  }

  for (const item of items) {
    const [sectionRows] = await db.execute<IdRow[]>(
      `SELECT id FROM landing_sections WHERE page_id = ? AND section_key = ? LIMIT 1`,
      [pageId, item.sectionKey],
    )
    const sectionId = sectionRows[0].id

    await db.execute(
      `INSERT INTO landing_section_items (
         section_id, item_key, title, subtitle, description, icon, badge,
         item_value, href, metadata_json, sort_order, is_highlighted, is_enabled
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         subtitle = VALUES(subtitle),
         description = VALUES(description),
         icon = VALUES(icon),
         badge = VALUES(badge),
         item_value = VALUES(item_value),
         href = VALUES(href),
         metadata_json = VALUES(metadata_json),
         sort_order = VALUES(sort_order),
         is_highlighted = VALUES(is_highlighted)`,
      [
        sectionId,
        item.itemKey,
        item.title,
        item.subtitle ?? null,
        item.description ?? null,
        item.icon ?? null,
        item.badge ?? null,
        item.value ?? null,
        item.href ?? null,
        item.metadata ? JSON.stringify(item.metadata) : null,
        item.sortOrder,
        item.isHighlighted ? 1 : 0,
      ],
    )
  }

  for (const [index, channel] of channels.entries()) {
    await db.execute(
      `INSERT INTO landing_channels (
         page_id, family_key, family_label, channel_name, description, advantage,
         sort_order, is_enabled
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE
         family_label = VALUES(family_label),
         description = VALUES(description),
         advantage = VALUES(advantage),
         sort_order = VALUES(sort_order)`,
      [pageId, channel[0], channel[1], channel[2], channel[3], channel[4], (index + 1) * 10],
    )
  }

  for (const pricing of packages) {
    await db.execute(
      `INSERT INTO landing_pricing_packages (
         page_id, name, price, price_suffix, badge, features_json, sort_order,
         is_popular, is_enabled
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE
         price = VALUES(price),
         price_suffix = VALUES(price_suffix),
         badge = VALUES(badge),
         features_json = VALUES(features_json),
         sort_order = VALUES(sort_order),
         is_popular = VALUES(is_popular)`,
      [
        pageId,
        pricing.name,
        pricing.price,
        pricing.priceSuffix ?? null,
        pricing.badge ?? null,
        JSON.stringify(pricing.features),
        pricing.sortOrder,
        pricing.isPopular ? 1 : 0,
      ],
    )
  }

  await db.execute(
    `INSERT INTO landing_contact_settings (
       page_id, phone, whatsapp, email, address, opening_hours, form_recipient, metadata_json
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       phone = VALUES(phone),
       whatsapp = VALUES(whatsapp),
       email = VALUES(email),
       address = VALUES(address),
       opening_hours = VALUES(opening_hours),
       form_recipient = VALUES(form_recipient),
       metadata_json = VALUES(metadata_json)`,
    [
      pageId,
      '[À COMPLÉTER]',
      '[À COMPLÉTER]',
      null,
      'Abidjan, Côte d’Ivoire',
      'Lun-Sam 8h-18h',
      null,
      JSON.stringify({ pendingFields: ['phone', 'whatsapp', 'email', 'formRecipient'] }),
    ],
  )

  console.log('Landing CMS tables and seed data are ready.')
}

run()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.end()
  })
