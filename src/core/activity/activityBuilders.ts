import type { ActivityEventInput } from './activityTypes'

type BaseContext = {
  projectId?: string | number | null
  organizationId?: string | number | null
  portfolioId?: string | number | null
  actorId?: string | null
  actorName?: string | null
  actorRole?: string | null
}

function base(context: BaseContext) {
  return {
    projectId: context.projectId,
    organizationId: context.organizationId,
    portfolioId: context.portfolioId,
    actorId: context.actorId,
    actorName: context.actorName,
    actorRole: context.actorRole,
  }
}

export const activityBuilders = {
  taskProgressUpdated(
    context: BaseContext,
    task: {
      id: string
      name?: string | null
      previousProgress: number
      newProgress: number
    }
  ): ActivityEventInput {
    return {
      ...base(context),
      eventType: 'task.progress_updated',
      module: 'schedule',
      title: `${task.name || 'Schedule activity'} updated`,
      description: `Progress changed from ${task.previousProgress}% to ${task.newProgress}%.`,
      entityType: 'task',
      entityId: task.id,
      route: '/app/schedule',
      severity:
        task.newProgress >= 100
          ? 'success'
          : task.newProgress < task.previousProgress
          ? 'warning'
          : 'info',
      metadata: {
        previousProgress: task.previousProgress,
        newProgress: task.newProgress,
      },
    }
  },

  approvalStatusChanged(
    context: BaseContext,
    item: {
      id: string
      title?: string | null
      previousStatus?: string | null
      newStatus: string
    }
  ): ActivityEventInput {
    return {
      ...base(context),
      eventType: 'approval.status_changed',
      module: 'approvals',
      title: `${item.title || 'Approval item'} ${item.newStatus.toLowerCase()}`,
      description: item.previousStatus
        ? `Status changed from ${item.previousStatus} to ${item.newStatus}.`
        : `Status set to ${item.newStatus}.`,
      entityType: 'approval',
      entityId: item.id,
      route: '/app/approvals',
      severity:
        item.newStatus === 'Approved'
          ? 'success'
          : item.newStatus === 'Rejected'
          ? 'critical'
          : 'warning',
      metadata: {
        previousStatus: item.previousStatus,
        newStatus: item.newStatus,
      },
    }
  },

  riskCreated(
    context: BaseContext,
    risk: {
      id: string
      title?: string | null
      score?: number | null
    }
  ): ActivityEventInput {
    const score = Number(risk.score || 0)

    return {
      ...base(context),
      eventType: 'risk.created',
      module: 'risk',
      title: `Risk added: ${risk.title || 'Untitled risk'}`,
      description: score ? `Risk score: ${score}.` : null,
      entityType: 'risk',
      entityId: risk.id,
      route: '/app/risk',
      severity: score >= 15 ? 'critical' : score >= 8 ? 'warning' : 'info',
      metadata: { score },
    }
  },

  snagStatusChanged(
    context: BaseContext,
    snag: {
      id: string
      title?: string | null
      previousStatus?: string | null
      newStatus: string
      severity?: string | null
    }
  ): ActivityEventInput {
    return {
      ...base(context),
      eventType: 'snag.status_changed',
      module: 'quality',
      title: `${snag.title || 'Snag'} ${snag.newStatus.toLowerCase()}`,
      description: snag.previousStatus
        ? `Status changed from ${snag.previousStatus} to ${snag.newStatus}.`
        : null,
      entityType: 'snag',
      entityId: snag.id,
      route: '/app/snags',
      severity:
        snag.newStatus === 'Closed'
          ? 'success'
          : snag.severity === 'Critical'
          ? 'critical'
          : 'warning',
      metadata: {
        previousStatus: snag.previousStatus,
        newStatus: snag.newStatus,
        snagSeverity: snag.severity,
      },
    }
  },

  documentUploaded(
    context: BaseContext,
    document: {
      id: string
      title?: string | null
      fileName?: string | null
      documentType?: string | null
    }
  ): ActivityEventInput {
    return {
      ...base(context),
      eventType: 'document.uploaded',
      module: 'documents',
      title: `${document.title || document.fileName || 'Document'} uploaded`,
      description: document.documentType
        ? `Document type: ${document.documentType}.`
        : null,
      entityType: 'document',
      entityId: document.id,
      route: '/app/documents',
      severity: 'info',
      metadata: {
        fileName: document.fileName,
        documentType: document.documentType,
      },
    }
  },

  reportSubmitted(
    context: BaseContext,
    report: {
      id: string
      title?: string | null
      reportType: string
      period?: string | null
    }
  ): ActivityEventInput {
    return {
      ...base(context),
      eventType: 'report.submitted',
      module: 'reports',
      title: `${report.title || report.reportType} submitted`,
      description: report.period
        ? `Reporting period: ${report.period}.`
        : null,
      entityType: 'report',
      entityId: report.id,
      route: '/app/reports',
      severity: 'success',
      metadata: {
        reportType: report.reportType,
        period: report.period,
      },
    }
  },
}
