import { Activity, AlertTriangle, ArrowUpRight, BarChart3, Brain, FileText, Gauge, LineChart, ShieldCheck, Target, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTasks } from '@/hooks/useTasks'
import { useProjectStore } from '@/store/project'
import { EnterpriseMetric, EnterpriseNotice, EnterprisePageHero, EnterpriseSection } from '@/components/ui/enterprise/EnterprisePage'

export default function BusinessIntelligencePage() {
  const navigate = useNavigate()
  const { projectId, projectName } = useProjectStore()
  const { data: allTasks = [] } = useTasks()
  const tasks = allTasks.filter((task: any) => task.project_id === projectId)
  const completed = tasks.filter((task: any) => task.status === 'Completed').length
  const delayed = tasks.filter((task: any) => task.status !== 'Completed' && task.finish_date && new Date(task.finish_date) < new Date()).length
  const progress = tasks.length ? Math.round(tasks.reduce((sum: number, task: any) => sum + (task.status === 'Completed' ? 100 : Number(task.progress_pct || 0)), 0) / tasks.length) : 0
  const remaining = Math.max(0, tasks.length - completed)

  const modules = [
    { title: 'Executive Dashboard', desc: 'Live project health, schedule, risk and delivery indicators.', icon: BarChart3, path: '/app' },
    { title: 'Recovery Intelligence', desc: 'Forecast completion and identify the activities driving delay.', icon: TrendingUp, path: '/app/recovery' },
    { title: 'Risk Intelligence', desc: 'Review current exposure and changes in the project risk profile.', icon: ShieldCheck, path: '/app/risk-trends' },
    { title: 'Executive Reports', desc: 'Generate management reports from live project records.', icon: FileText, path: '/app/executive-reporting' },
  ]

  return (
    <div className="-m-4 min-h-screen bg-[var(--pmx-bg)] p-4 text-[var(--pmx-text)] sm:-m-6 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <EnterprisePageHero
          eyebrow="Executive intelligence"
          title="Business Intelligence"
          description={`Turn live data for ${projectName || 'the selected project'} into clear decisions, early warnings and management reporting.`}
          projectName={projectName}
        >
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="pmx-status pmx-status-primary">{progress}% overall progress</span>
            <span className={`pmx-status ${delayed ? 'pmx-status-danger' : 'pmx-status-success'}`}>
              {delayed ? `${delayed} delayed activities` : 'No overdue activity detected'}
            </span>
          </div>
        </EnterprisePageHero>

        {delayed > 0 && (
          <EnterpriseNotice tone="warning">
            {delayed} activities are past their planned finish dates. Recovery Intelligence should be reviewed before the next management update.
          </EnterpriseNotice>
        )}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <EnterpriseMetric icon={Activity} label="Activities" value={tasks.length} helper="Total programme activities" />
          <EnterpriseMetric icon={Target} label="Completed" value={completed} helper="Activities closed" tone="green" />
          <EnterpriseMetric icon={AlertTriangle} label="Delayed" value={delayed} helper={delayed ? 'Requires intervention' : 'No current delay'} tone={delayed ? 'red' : 'navy'} />
          <EnterpriseMetric icon={Gauge} label="Remaining" value={remaining} helper="Activities still open" tone="coral" />
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <EnterpriseSection title="Choose an analysis centre" description="Open a specialist workspace without leaving the project context.">
            <div className="grid gap-3 md:grid-cols-2">
              {modules.map(({ title, desc, icon: Icon, path }) => (
                <button key={title} onClick={() => navigate(path)} className="group rounded-2xl border border-[var(--pmx-border)] bg-white p-5 text-left transition hover:border-[var(--pmx-primary-300)] hover:shadow-[var(--pmx-shadow-sm)]">
                  <div className="flex justify-between">
                    <span className="rounded-xl bg-[var(--pmx-primary-50)] p-2.5 text-[var(--pmx-primary-700)]"><Icon size={19} /></span>
                    <ArrowUpRight size={16} className="text-[var(--pmx-text-muted)] transition group-hover:text-[var(--pmx-accent-600)]" />
                  </div>
                  <h3 className="mt-4 font-semibold text-[var(--pmx-heading)]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--pmx-text-muted)]">{desc}</p>
                </button>
              ))}
            </div>
          </EnterpriseSection>

          <aside className="space-y-5">
            <EnterpriseSection title="Management interpretation" description="Current delivery signal from available schedule data.">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--pmx-heading)]"><Brain size={17} className="text-[var(--pmx-accent-600)]" />{delayed ? 'Delivery requires attention' : 'Delivery remains controlled'}</div>
              <p className="mt-3 text-sm leading-7 text-[var(--pmx-text-muted)]">
                {delayed ? `${delayed} activities are past their planned finish dates. Open Recovery Intelligence to identify the immediate sequence constraint.` : 'No overdue activity is currently detected from the available programme data. Continue protecting upcoming approvals and milestones.'}
              </p>
              <button onClick={() => navigate('/app/recovery')} className="btn btn-primary mt-5">Open recovery view</button>
            </EnterpriseSection>
            <EnterpriseSection title="Next intelligence layer" description="Future analytical depth as comparable data grows.">
              <div className="flex items-start gap-3 text-sm leading-7 text-[var(--pmx-text-muted)]"><LineChart size={18} className="mt-1 shrink-0 text-[var(--pmx-primary-700)]" />Portfolio benchmarking, SPI/CPI and trend analytics can be activated as comparable project data becomes available.</div>
            </EnterpriseSection>
          </aside>
        </div>
      </div>
    </div>
  )
}
