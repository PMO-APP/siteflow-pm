import {
  Building2,
  Users,
  MailPlus,
  KeyRound,
  Layers3,
  ClipboardList,
  Briefcase,
  Settings,
} from 'lucide-react'
import AdminCard from '@/components/administration/AdminCard'

const modules = [
  {
    title: 'Organizations',
    description: 'Manage consultants, contractors, vendors, clients and project assignments.',
    to: '/app/administration/organizations',
    icon: Building2,
    status: 'ready' as const,
  },
  {
    title: 'Users',
    description: 'Review workspace users and organization associations.',
    to: '/app/administration/users',
    icon: Users,
    status: 'coming-soon' as const,
  },
  {
    title: 'Invitations',
    description: 'Track and issue internal or external invitations.',
    to: '/app/administration/invitations',
    icon: MailPlus,
    status: 'coming-soon' as const,
  },
  {
    title: 'Roles & Permissions',
    description: 'Control workspace, portfolio, project and organization access.',
    to: '/app/administration/roles',
    icon: KeyRound,
    status: 'coming-soon' as const,
  },
  {
    title: 'Workspaces',
    description: 'Configure internal, external and future client workspaces.',
    to: '/app/administration/workspaces',
    icon: Layers3,
    status: 'coming-soon' as const,
  },
  {
    title: 'Audit Log',
    description: 'Review important administrative activity.',
    to: '/app/administration/audit',
    icon: ClipboardList,
    status: 'ready' as const,
  },
  {
    title: 'Portfolios',
    description: 'Manage portfolios and project assignments.',
    to: '/app/administration/portfolios',
    icon: Briefcase,
    status: 'coming-soon' as const,
  },
  {
    title: 'System Settings',
    description: 'Configure platform-wide settings.',
    to: '/app/administration/settings',
    icon: Settings,
    status: 'coming-soon' as const,
  },
]

export default function AdministrationPage() {
  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
        <div className="text-[10px] uppercase tracking-[0.28em] text-blue-400">
          Workspace control
        </div>
        <h1 className="mt-2 font-display text-2xl font-semibold text-slate-100">
          Administration
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Manage organizations, users, access, workspaces and system configuration.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {modules.map(module => <AdminCard key={module.title} {...module} />)}
      </div>
    </section>
  )
}
