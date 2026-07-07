import { getMailSetting } from '../mail-settings.service.js'
import { BaseMailProvider } from './base-provider.js'

export class MailgunProvider extends BaseMailProvider {
  key = 'mailgun' as const
  name = 'Mailgun'

  protected requiredConfig() {
    return {
      MAILGUN_API_KEY: getMailSetting('MAILGUN_API_KEY'),
      MAILGUN_DOMAIN: getMailSetting('MAILGUN_DOMAIN'),
      MAIL_FROM: getMailSetting('MAIL_FROM'),
    }
  }
}
