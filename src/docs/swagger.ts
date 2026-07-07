import type { Express } from 'express'
import swaggerUi from 'swagger-ui-express'
import { openApiSpec } from './openapi.js'

export function registerSwagger(app: Express) {
  app.get('/openapi.json', (_request, response) => {
    response.json(openApiSpec)
  })

  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      customSiteTitle: 'Top Teaser API Docs',
      swaggerOptions: {
        persistAuthorization: true,
      },
    }),
  )
}
