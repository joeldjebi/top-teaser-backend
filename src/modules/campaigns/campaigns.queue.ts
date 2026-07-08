import type { Campaign } from './campaigns.types.js'

type CampaignQueueJob = {
  id: string
  campaign: Campaign
  attempts: number
  enqueuedAt: string
  lastError: string | null
  source: 'manual' | 'cron'
  status: 'queued' | 'running' | 'done' | 'failed'
}

const jobs = new Map<string, CampaignQueueJob>()
let activeJobId: string | null = null

export function enqueueCampaignJob(
  campaign: Campaign,
  source: CampaignQueueJob['source'],
) {
  const id = `${source}:${campaign.id}`
  const existing = jobs.get(id)

  if (existing && ['queued', 'running'].includes(existing.status)) {
    return existing
  }

  const job: CampaignQueueJob = {
    id,
    campaign,
    attempts: 0,
    enqueuedAt: new Date().toISOString(),
    lastError: null,
    source,
    status: 'queued',
  }

  jobs.set(id, job)
  return job
}

export async function drainCampaignQueue(
  handler: (campaign: Campaign, source: CampaignQueueJob['source']) => Promise<void>,
) {
  if (activeJobId) return

  const nextJob = Array.from(jobs.values()).find((job) => job.status === 'queued')
  if (!nextJob) return

  activeJobId = nextJob.id
  nextJob.status = 'running'
  nextJob.attempts += 1

  try {
    await handler(nextJob.campaign, nextJob.source)
    nextJob.status = 'done'
    nextJob.lastError = null
  } catch (error) {
    nextJob.status = nextJob.attempts >= 3 ? 'failed' : 'queued'
    nextJob.lastError = error instanceof Error ? error.message : String(error)
    throw error
  } finally {
    activeJobId = null
  }

  await drainCampaignQueue(handler)
}

export function getCampaignQueueStatus() {
  const values = Array.from(jobs.values())

  return {
    activeJobId,
    queued: values.filter((job) => job.status === 'queued').length,
    running: values.filter((job) => job.status === 'running').length,
    done: values.filter((job) => job.status === 'done').length,
    failed: values.filter((job) => job.status === 'failed').length,
    recentJobs: values
      .slice(-20)
      .reverse()
      .map(({ campaign, ...job }) => ({
        ...job,
        campaignId: campaign.id,
        campaignName: campaign.name,
      })),
  }
}
