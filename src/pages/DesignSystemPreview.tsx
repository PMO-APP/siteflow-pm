import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  FileCheck,
  Lightbulb,
  Shield,
  TrendingUp,
} from 'lucide-react'
import {
  ActivityFeed,
  CommandCard,
  HealthGauge,
  InsightPanel,
  MetricCard,
  ProgressRing,
  SectionHeader,
  StatusPill,
  TimelineBar,
} from '@/components/ui'

export default function DesignSystemPreview() {
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="PMOCorex Design System"
        title="UI Component Library"
        description="Reusable components for Dashboard, Recovery, Costing, Quality, Risk, HSE and project controls."
        action={<button className="pmx-btn-primary">Primary Action</button>}
      />

      <div className="flex flex-wrap gap-2">
        <StatusPill label="Completed" tone="success" dot />
        <StatusPill label="In Progress" tone="primary" dot />
        <StatusPill label="Pending" tone="warning" dot />
        <StatusPill label="Critical" tone="danger" dot />
        <StatusPill label="Draft" tone="neutral" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Overall Progress"
          value="68%"
          helper="142 of 208 tasks completed"
          icon={TrendingUp}
          tone="primary"
          trend={{ value: 4.2, label: 'this week' }}
        />
        <MetricCard
          label="Overdue Tasks"
          value={12}
          helper="4 are critical-path activities"
          icon={AlertTriangle}
          tone="danger"
        />
        <MetricCard
          label="Pending Approvals"
          value={7}
          helper="2 overdue"
          icon={FileCheck}
          tone="warning"
        />
        <MetricCard
          label="Quality Pass Rate"
          value="92%"
          helper="Last 30 days"
          icon={CheckCircle2}
          tone="success"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <CommandCard
          title="Forecast Completion"
          value="26 Oct 2026"
          description="Current programme target: 18 Sep 2026"
          icon={CalendarDays}
          tone="danger"
          status="+38 days"
          statusTone="danger"
          footer="Read from the current approved schedule and recovery forecast."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <ProgressRing
              value={68}
              label="Physical progress"
              helper="Weighted schedule progress"
              tone="primary"
              size={88}
            />
            <HealthGauge
              value={72}
              label="Recovery Index"
              helper="Recoverable with intervention"
              size="sm"
            />
          </div>
        </CommandCard>

        <div className="pmx-card p-4 xl:col-span-2">
          <SectionHeader
            title="Workfront Timeline"
            description="Clicking a phase can open the relevant schedule view."
          />
          <div className="mt-5">
            <TimelineBar
              segments={[
                { id: '1', label: 'Substructure', value: 100, tone: 'success' },
                { id: '2', label: 'Superstructure', value: 88, tone: 'success' },
                { id: '3', label: 'MEP First Fix', value: 51, tone: 'warning' },
                { id: '4', label: 'Finishes', value: 17, tone: 'danger' },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="pmx-card p-4">
          <SectionHeader
            title="Live Activity"
            description="Combined events from the different PMOCorex modules."
          />
          <div className="mt-3">
            <ActivityFeed
              items={[
                {
                  id: '1',
                  title: 'Drawing A-105 approved',
                  description: 'Design review completed and approval recorded.',
                  timestamp: '10:42',
                  actor: 'Design Team',
                  icon: CheckCircle2,
                  tone: 'success',
                },
                {
                  id: '2',
                  title: 'Programme task updated',
                  description: 'M&E first fix progress changed from 42% to 51%.',
                  timestamp: '10:28',
                  actor: 'Project Manager',
                  icon: Activity,
                  tone: 'primary',
                },
                {
                  id: '3',
                  title: 'High risk escalated',
                  description: 'Roofing material delivery remains outstanding.',
                  timestamp: '09:55',
                  actor: 'PMO',
                  icon: Shield,
                  tone: 'danger',
                },
              ]}
            />
          </div>
        </div>

        <InsightPanel
          title="Project Assistant"
          summary="The project remains recoverable, but roofing and M&E first fix must be closed before ceiling installation can progress."
          points={[
            'Escalate roofing material delivery today.',
            'Approve additional M&E manpower for the next two weeks.',
            'Hold a daily recovery review until the production gap closes.',
          ]}
          icon={Lightbulb}
          tone="primary"
          badge="Generated"
          generatedAt="14:45"
        />
      </div>
    </div>
  )
}
