export class MailProviderConfigurationError extends Error {
  constructor(providerName: string, missingConfig: string[]) {
    super(
      `${providerName} is not configured. Missing: ${missingConfig.join(', ')}`,
    )
    this.name = 'MailProviderConfigurationError'
  }
}
