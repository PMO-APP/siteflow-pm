import { Bell, LockKeyhole, Palette, Settings2, UserRound, UsersRound } from 'lucide-react'
import { EnterpriseMetric, EnterpriseNotice, EnterprisePageHero, EnterpriseSection } from '@/components/ui/enterprise/EnterprisePage'

const groups = [
  { icon: UserRound, title: 'Account preferences', description: 'Profile information, password management and personal notification preferences.', status: 'Available in Profile' },
  { icon: Bell, title: 'Notification rules', description: 'Control email alerts, reminders and project exception notifications.', status: 'Planned' },
  { icon: UsersRound, title: 'Workspace defaults', description: 'Manage organization, portfolio and project-level workspace preferences.', status: 'Admin controlled' },
  { icon: LockKeyhole, title: 'Security controls', description: 'Authentication, session and access-policy configuration.', status: 'Admin controlled' },
  { icon: Palette, title: 'Appearance', description: 'PMOCorex design settings and future workspace branding options.', status: 'System standard' },
  { icon: Settings2, title: 'Platform configuration', description: 'Global system behavior, integrations and automation defaults.', status: 'Planned' },
]

export default function SettingsPage() {
  return <div className="min-h-screen bg-[#f6f5f1] text-[#18212b] -m-4 p-4 sm:-m-6 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-[1600px] space-y-5">
      <EnterprisePageHero eyebrow="Workspace preferences" title="Settings" description="Review personal preferences and workspace controls available within PMOCorex." />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <EnterpriseMetric label="Design system" value="PMOCorex" helper="Navy, coral and white" icon={Palette}/>
        <EnterpriseMetric label="Security" value="Managed" helper="Workspace role controls" icon={LockKeyhole} tone="green"/>
        <EnterpriseMetric label="Notifications" value="Active" helper="Project alerts enabled" icon={Bell} tone="coral"/>
      </section>
      <EnterpriseNotice>Workspace-wide security, invitations and access controls are managed from Administration and Team Access. Personal account details remain available from your Profile page.</EnterpriseNotice>
      <EnterpriseSection title="Preference centres" description="Settings are grouped by the area of the platform they affect.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{groups.map(({icon: Icon, title, description, status}) => <article key={title} className="rounded-2xl border border-[#e1e6ea] bg-[#fbfcfc] p-5"><div className="flex items-start justify-between gap-4"><div className="rounded-xl bg-[#eaf1f7] p-2.5 text-[#123a60]"><Icon size={18}/></div><span className="rounded-full border border-[#dbe4ea] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#6f7d89]">{status}</span></div><h3 className="mt-5 font-semibold text-[#102943]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#74818d]">{description}</p></article>)}</div>
      </EnterpriseSection>
    </div>
  </div>
}
