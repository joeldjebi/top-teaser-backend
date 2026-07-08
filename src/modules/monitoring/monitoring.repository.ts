import type { RowDataPacket } from 'mysql2'
import { db } from '../../database/mysql.js'
import { getCampaignSchedulerStatus } from '../campaigns/campaigns.scheduler.js'
import { listCommunicationProviders } from '../communication-providers/communication-providers.repository.js'
import { listTechnicalLogs } from '../technical-logs/technical-logs.repository.js'

type CountRow = RowDataPacket & {
  label: string
  total: number
}

async function countByStatus(table: string) {
  const [rows] = await db.execute<CountRow[]>(
    `SELECT status AS label, COUNT(*) AS total FROM ${table} GROUP BY status`,
  )

  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.label] = Number(row.total)
    return acc
  }, {})
}

export async function getMonitoringOverview() {
  const [campaignsByStatus, channelsByStatus, providers, technicalLogs] =
    await Promise.all([
      countByStatus('campaigns'),
      countByStatus('campaign_channels'),
      listCommunicationProviders(),
      listTechnicalLogs(20),
    ])

  const [blockedCampaigns] = await db.execute<RowDataPacket[]>(
    `SELECT id, name, status, error_message, updated_at
     FROM campaigns
     WHERE status IN ('failed', 'sending')
       AND updated_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 MINUTE)
     ORDER BY updated_at ASC
     LIMIT 20`,
  )

  const [recentEvents] = await db.execute<RowDataPacket[]>(
    `SELECT provider, event_type, provider_message_id, occurred_at
     FROM email_events
     ORDER BY occurred_at DESC
     LIMIT 20`,
  )

  return {
    checkedAt: new Date().toISOString(),
    scheduler: getCampaignSchedulerStatus(),
    database: {
      status: 'ok',
    },
    campaignsByStatus,
    channelsByStatus,
    activeProviders: providers.filter((provider) => provider.isActive),
    blockedCampaigns: blockedCampaigns.map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      errorMessage: row.error_message,
      updatedAt: row.updated_at?.toISOString?.() ?? String(row.updated_at),
    })),
    recentProviderEvents: recentEvents.map((row) => ({
      provider: row.provider,
      eventType: row.event_type,
      providerMessageId: row.provider_message_id,
      occurredAt: row.occurred_at?.toISOString?.() ?? String(row.occurred_at),
    })),
    recentTechnicalErrors: technicalLogs.filter((log) => log.level === 'error'),
  }
}
