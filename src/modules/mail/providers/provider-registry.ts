import {
  ensureMailSettingsLoaded,
} from '../mail-settings.repository.js'
import { getMailProviderSetting } from '../mail-settings.service.js'
import { AmazonSesProvider } from './amazon-ses.provider.js'
import { BrevoProvider } from './brevo.provider.js'
import { MailgunProvider } from './mailgun.provider.js'
import type { MailProvider, MailProviderKey } from './mail-provider.js'
import { PostmarkProvider } from './postmark.provider.js'
import { SendgridProvider } from './sendgrid.provider.js'

const providers: MailProvider[] = [
  new PostmarkProvider(),
  new SendgridProvider(),
  new MailgunProvider(),
  new BrevoProvider(),
  new AmazonSesProvider(),
]

export async function listMailProviders() {
  await ensureMailSettingsLoaded()
  const activeProvider = getMailProviderSetting()

  return providers.map((provider) => ({
    key: provider.key,
    name: provider.name,
    active: provider.key === activeProvider,
    health: provider.getHealth(),
  }))
}

export async function getMailProvider(key?: MailProviderKey) {
  await ensureMailSettingsLoaded()
  const providerKey = key ?? getMailProviderSetting()
  const provider = providers.find((candidate) => candidate.key === key)
    ?? providers.find((candidate) => candidate.key === providerKey)

  if (!provider) {
    throw new Error(`Unknown mail provider: ${providerKey}`)
  }

  return provider
}
