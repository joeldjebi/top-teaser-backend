import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { env } from './config/env.js'
import { registerSwagger } from './docs/swagger.js'
import { startCampaignScheduler } from './modules/campaigns/campaigns.scheduler.js'
import { publicUnsubscribeRouter } from './modules/unsubscribes/unsubscribes.routes.js'
import { apiRouter } from './routes/api.js'

const app = express()

app.use(helmet())
app.use(
  cors({
    origin: env.appUrl,
  }),
)
app.use(express.json({ limit: '2mb' }))

registerSwagger(app)

app.get('/health', (_request, response) => {
  response.json({
    status: 'ok',
    service: 'top-teaser-backend',
  })
})

app.use('/api', apiRouter)
app.use('/unsubscribe', publicUnsubscribeRouter)

app.listen(env.port, () => {
  console.log(`API ready on http://localhost:${env.port}`)
  startCampaignScheduler()
})
