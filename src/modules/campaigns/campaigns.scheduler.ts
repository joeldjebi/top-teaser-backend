import {
  getCampaignStats,
  getNextScheduledCampaignTime,
  listCampaignsAwaitingBulkStatus,
  listScheduledCampaignsDueNow,
  updateCampaign,
} from './campaigns.repository.js'
import {
  drainCampaignQueue,
  enqueueCampaignJob,
  getCampaignQueueStatus,
} from './campaigns.queue.js'
import { prepareCampaign, sendCampaign, syncCampaignBulkStatus } from './campaigns.service.js'
import { createTechnicalLog } from '../technical-logs/technical-logs.repository.js'

let isSchedulerRunning = false
let isExecuting = false
let shouldRunAfterCurrentExecution = false
let schedulerTimeout: NodeJS.Timeout | null = null
let lastRunAt: string | null = null
let lastRunError: string | null = null
let nextRunAt: string | null = null

const IDLE_CHECK_DELAY_MS = 5 * 60 * 1000
const ERROR_RETRY_DELAY_MS = 60 * 1000
const BULK_STATUS_CHECK_DELAY_MS = 60 * 1000
const DUE_SOON_THRESHOLD_MS = 60 * 1000
const DUE_SOON_CHECK_DELAY_MS = 10 * 1000
const MIN_CHECK_DELAY_MS = 1000

function clearSchedulerTimeout() {
  if (schedulerTimeout) {
    clearTimeout(schedulerTimeout)
    schedulerTimeout = null
  }
}

function setNextExecution(delayMs: number, reason: string) {
  clearSchedulerTimeout()
  const normalizedDelay = Math.max(delayMs, MIN_CHECK_DELAY_MS)
  console.log(
    `[Campaigns] Next scheduler check in ${Math.round(normalizedDelay / 1000)}s (${reason})`,
  )
  nextRunAt = new Date(Date.now() + normalizedDelay).toISOString()
  schedulerTimeout = setTimeout(executeScheduledCampaigns, normalizedDelay)
}

async function executeScheduledCampaigns() {
  if (!isSchedulerRunning) {
    return
  }

  if (isExecuting) {
    shouldRunAfterCurrentExecution = true
    console.log('[Campaigns] Scheduler execution already running, queued one extra check')
    return
  }

  clearSchedulerTimeout()
  isExecuting = true

  try {
    const now = new Date()
    lastRunAt = now.toISOString()
    lastRunError = null
    console.log(`[Campaigns] Checking for due campaigns at ${now.toISOString()}...`)

    const dueCampaigns = await listScheduledCampaignsDueNow()
    console.log(`[Campaigns] Found ${dueCampaigns.length} campaign(s) due to send`)

    if (dueCampaigns.length > 0) {
      for (const campaign of dueCampaigns) {
        try {
          console.log(
            `[Campaigns] Processing campaign ${campaign.id}: "${campaign.name}" (scheduled for ${campaign.scheduledAt})`,
          )

          // Check if recipients are prepared
          const stats = await getCampaignStats(campaign.id)
          if (stats.total === 0) {
            console.log(
              `[Campaigns] No recipients prepared for campaign ${campaign.id}, preparing now...`,
            )
            const preparation = await prepareCampaign(campaign)
            console.log(
              `[Campaigns] ✅ Recipients prepared: ${preparation.preparedRecipients}`,
            )
          }

          enqueueCampaignJob(campaign, 'cron')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          console.error(
            `[Campaigns] ❌ Error sending campaign ${campaign.id}: ${errorMessage}`,
          )
          await createTechnicalLog({
            level: 'error',
            scope: 'scheduler',
            event: 'campaign_enqueue_failed',
            message: `Erreur scheduler sur la campagne ${campaign.id}.`,
            campaignId: campaign.id,
            error: errorMessage,
          })

          // Record the error in the database
          try {
            await updateCampaign(campaign.id, {
              status: 'failed',
              errorMessage: `Scheduler error: ${errorMessage}`,
            })
            console.log(
              `[Campaigns] Campaign ${campaign.id} marked as failed with error message`,
            )
          } catch (updateError) {
            console.error(
              `[Campaigns] Failed to update campaign ${campaign.id} error status:`,
              updateError instanceof Error ? updateError.message : updateError,
            )
          }
        }
      }

      await drainCampaignQueue(async (campaign, source) => {
        console.log(
          `[Campaigns] Sending queued campaign ${campaign.id}: "${campaign.name}"`,
        )
        const result = await sendCampaign(campaign, source)
        console.log(
          `[Campaigns] Campaign ${campaign.id} finished with status "${result.campaign.status}" (${result.sent} sent, ${result.failed} failed)`,
        )
      })
    }

    const bulkCampaigns = await listCampaignsAwaitingBulkStatus()
    console.log(
      `[Campaigns] Found ${bulkCampaigns.length} bulk campaign(s) awaiting status sync`,
    )

    for (const campaign of bulkCampaigns) {
      try {
        console.log(
          `[Campaigns] Syncing bulk status for campaign ${campaign.id}: "${campaign.name}"`,
        )
        const result = await syncCampaignBulkStatus(campaign, 'cron')
        console.log(
          `[Campaigns] Bulk campaign ${campaign.id} status is "${result.campaign.status}" (${result.bulkStatus.status})`,
        )
      } catch (error) {
        console.error(
          `[Campaigns] Unable to sync bulk campaign ${campaign.id}:`,
          error instanceof Error ? error.message : error,
        )
      }
    }
  } catch (error) {
    lastRunError = error instanceof Error ? error.message : String(error)
    console.error(
      '[Campaigns] ❌ Scheduler error:',
      error instanceof Error ? error.message : error,
    )
  } finally {
    isExecuting = false
  }

  if (shouldRunAfterCurrentExecution) {
    shouldRunAfterCurrentExecution = false
    setNextExecution(MIN_CHECK_DELAY_MS, 'queued wake after running execution')
    return
  }

  await scheduleNextCheck()
}

async function scheduleNextCheck() {
  try {
    const now = new Date()
    const bulkCampaigns = await listCampaignsAwaitingBulkStatus()

    // Find the next scheduled campaign time
    const nextScheduledTime = await getNextScheduledCampaignTime()

    if (!nextScheduledTime) {
      setNextExecution(
        bulkCampaigns.length > 0 ? BULK_STATUS_CHECK_DELAY_MS : IDLE_CHECK_DELAY_MS,
        bulkCampaigns.length > 0
          ? 'bulk campaigns awaiting status sync'
          : 'no upcoming scheduled campaign',
      )
      return
    }

    const timeUntilExecution = nextScheduledTime.getTime() - now.getTime()

    if (timeUntilExecution <= 0) {
      setNextExecution(MIN_CHECK_DELAY_MS, 'campaign already due')
    } else if (timeUntilExecution < DUE_SOON_THRESHOLD_MS) {
      setNextExecution(
        Math.min(DUE_SOON_CHECK_DELAY_MS, timeUntilExecution),
        `next campaign due in ${Math.round(timeUntilExecution / 1000)}s`,
      )
    } else {
      const scheduledWakeDelay = Math.max(
        timeUntilExecution - DUE_SOON_THRESHOLD_MS,
        DUE_SOON_THRESHOLD_MS,
      )
      const nextDelay =
        bulkCampaigns.length > 0
          ? Math.min(BULK_STATUS_CHECK_DELAY_MS, scheduledWakeDelay)
          : scheduledWakeDelay

      setNextExecution(
        nextDelay,
        bulkCampaigns.length > 0
          ? `bulk sync pending and campaign due in ${Math.round(timeUntilExecution / 1000)}s`
          : `wake one minute before campaign due in ${Math.round(timeUntilExecution / 1000)}s`,
      )
    }
  } catch (error) {
    console.error(
      '[Campaigns] Error scheduling next check:',
      error instanceof Error ? error.message : error,
    )
    setNextExecution(ERROR_RETRY_DELAY_MS, 'scheduler planning error')
  }
}

export function startCampaignScheduler() {
  if (isSchedulerRunning) {
    console.log('[Campaigns] Scheduler already running')
    return
  }

  isSchedulerRunning = true
  console.log('[Campaigns] Scheduler started (intelligent mode)')

  setNextExecution(MIN_CHECK_DELAY_MS, 'startup')
}

export function wakeCampaignScheduler() {
  if (!isSchedulerRunning) {
    return
  }

  if (isExecuting) {
    shouldRunAfterCurrentExecution = true
    console.log('[Campaigns] Scheduler wake queued because execution is running')
    return
  }

  console.log('[Campaigns] Scheduler awakened after campaign planning change')
  setNextExecution(MIN_CHECK_DELAY_MS, 'campaign planning change')
}

export function stopCampaignScheduler() {
  clearSchedulerTimeout()
  isSchedulerRunning = false
  isExecuting = false
  shouldRunAfterCurrentExecution = false
  console.log('[Campaigns] Scheduler stopped')
}

export function getCampaignSchedulerStatus() {
  return {
    isRunning: isSchedulerRunning,
    isExecuting,
    lastRunAt,
    lastRunError,
    nextRunAt,
    queue: getCampaignQueueStatus(),
    hasPendingWake: shouldRunAfterCurrentExecution,
  }
}
