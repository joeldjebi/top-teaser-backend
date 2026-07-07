import { getMailSetting } from '../mail-settings.service.js'
import { BaseMailProvider } from './base-provider.js'

export class SendgridProvider extends BaseMailProvider {
  key = 'sendgrid' as const
  name = 'SendGrid'

  protected requiredConfig() {
    return {
      SENDGRID_API_KEY: getMailSetting('SENDGRID_API_KEY'),
      MAIL_FROM: getMailSetting('MAIL_FROM'),
    }
  }
}
