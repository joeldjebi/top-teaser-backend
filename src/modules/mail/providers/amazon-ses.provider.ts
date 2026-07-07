import { getMailSetting } from '../mail-settings.service.js'
import { BaseMailProvider } from './base-provider.js'

export class AmazonSesProvider extends BaseMailProvider {
  key = 'amazon-ses' as const
  name = 'Amazon SES'

  protected requiredConfig() {
    return {
      AWS_SES_REGION: getMailSetting('AWS_SES_REGION'),
      AWS_SES_ACCESS_KEY_ID: getMailSetting('AWS_SES_ACCESS_KEY_ID'),
      AWS_SES_SECRET_ACCESS_KEY: getMailSetting('AWS_SES_SECRET_ACCESS_KEY'),
      MAIL_FROM: getMailSetting('MAIL_FROM'),
    }
  }
}
