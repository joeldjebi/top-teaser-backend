import type {
  MailProvider,
  MailProviderHealth,
  SendMailInput,
  SendMailResult,
} from './mail-provider.js'
import { MailProviderConfigurationError } from './provider-error.js'

export abstract class BaseMailProvider implements MailProvider {
  abstract key: MailProvider['key']
  abstract name: string

  protected abstract requiredConfig(): Record<string, string | undefined>

  getHealth(): MailProviderHealth {
    const missingConfig = Object.entries(this.requiredConfig())
      .filter(([, value]) => !value)
      .map(([key]) => key)

    return {
      configured: missingConfig.length === 0,
      missingConfig,
    }
  }

  async send(_input: SendMailInput): Promise<SendMailResult> {
    const health = this.getHealth()

    if (!health.configured) {
      throw new MailProviderConfigurationError(this.name, health.missingConfig)
    }

    throw new Error(`${this.name} adapter send() is not implemented yet`)
  }
}
