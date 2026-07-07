import { getCampaignStats, getNextScheduledCampaignTime, listScheduledCampaignsDueNow, updateCampaign } from './campaigns.repository.js'
import { prepareCampaign, sendCampaign } from './campaigns.service.js'

let isSchedulerRunning = false
let schedulerTimeout: NodeJS.Timeout | null = null

async function executeScheduledCampaigns() {
  try {
    const now = new Date()
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
            await prepareCampaign(campaign)
            console.log(`[Campaigns] ✅ Recipients prepared: ${stats.total}`)
          }

          console.log(
            `[Campaigns] Sending campaign ${campaign.id}: "${campaign.name}"`,
          )
          const result = await sendCampaign(campaign, 'cron')
          console.log(
            `[Campaigns] Campaign ${campaign.id} finished with status "${result.campaign.status}" (${result.sent} sent, ${result.failed} failed)`,
          )
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          console.error(
            `[Campaigns] ❌ Error sending campaign ${campaign.id}: ${errorMessage}`,
          )

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
    }
  } catch (error) {
    console.error(
      '[Campaigns] ❌ Scheduler error:',
      error instanceof Error ? error.message : error,
    )
  }

  // Schedule next check
  scheduleNextCheck()
}

async function scheduleNextCheck() {
  try {
    const now = new Date()

    // Find the next scheduled campaign time
    const nextScheduledTime = await getNextScheduledCampaignTime()

    if (!nextScheduledTime) {
      // No upcoming campaigns, check again in 5 minutes
      const nextCheck = 5 * 60 * 1000
      console.log(`[Campaigns] No more scheduled campaigns to process, next check in 5 minutes`)
      schedulerTimeout = setTimeout(executeScheduledCampaigns, nextCheck)
      return
    }

    const timeUntilExecution = nextScheduledTime.getTime() - now.getTime()

    if (timeUntilExecution <= 0) {
      // Campaign is due now, check immediately
      console.log(`[Campaigns] Campaign is due now, executing immediately`)
      await executeScheduledCampaigns()
    } else if (timeUntilExecution < 60000) {
      // Campaign will be due soon (less than 1 minute), check in 10 seconds
      const nextCheck = 10 * 1000
      console.log(
        `[Campaigns] Next campaign due in ${Math.round(timeUntilExecution / 1000)}s, checking again in 10s`,
      )
      schedulerTimeout = setTimeout(executeScheduledCampaigns, nextCheck)
    } else {
      // Campaign will be due later, check 1 minute before
      const nextCheck = Math.max(timeUntilExecution - 60000, 60000)
      console.log(
        `[Campaigns] Next campaign due in ${Math.round(timeUntilExecution / 1000)}s, next check in ${Math.round(nextCheck / 1000)}s`,
      )
      schedulerTimeout = setTimeout(executeScheduledCampaigns, nextCheck)
    }
  } catch (error) {
    console.error(
      '[Campaigns] Error scheduling next check:',
      error instanceof Error ? error.message : error,
    )
    // Fall back to checking again in 1 minute if there's an error
    schedulerTimeout = setTimeout(executeScheduledCampaigns, 60000)
  }
}

export function startCampaignScheduler() {
  if (isSchedulerRunning) {
    console.log('[Campaigns] Scheduler already running')
    return
  }

  isSchedulerRunning = true
  console.log('[Campaigns] Scheduler started (intelligent mode)')

  // Start the first check immediately
  void executeScheduledCampaigns()
}

export function wakeCampaignScheduler() {
  if (!isSchedulerRunning) {
    return
  }

  if (schedulerTimeout) {
    clearTimeout(schedulerTimeout)
    schedulerTimeout = null
  }

  console.log('[Campaigns] Scheduler awakened after campaign planning change')
  schedulerTimeout = setTimeout(executeScheduledCampaigns, 1000)
}

export function stopCampaignScheduler() {
  if (schedulerTimeout) {
    clearTimeout(schedulerTimeout)
    schedulerTimeout = null
  }
  isSchedulerRunning = false
  console.log('[Campaigns] Scheduler stopped')
}
