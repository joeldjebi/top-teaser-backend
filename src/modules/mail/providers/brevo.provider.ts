import { getMailSetting } from '../mail-settings.service.js'
import { BaseMailProvider } from './base-provider.js'

export class BrevoProvider extends BaseMailProvider {
  key = 'brevo' as const
  name = 'Brevo'

  protected requiredConfig() {
    return {
      BREVO_API_KEY: getMailSetting('BREVO_API_KEY'),
      MAIL_FROM: getMailSetting('MAIL_FROM'),
    }
  }
}
