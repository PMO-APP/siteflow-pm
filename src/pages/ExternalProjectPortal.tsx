import {
  ClipboardList,
  FileText,
  FolderUp,
  MessageSquare,
  UploadCloud,
  CheckCircle,
  LogOut,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useMembershipStore } from '@/store/membership'
import { PMOCorexLogo } from '@/components/brand/PMOCorexLogo'

export default function ExternalProjectPortal() {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()

  const role = useMembershipStore(state => state.role)
  const projectId = useMembershipStore(state => state.projectId)

  return (
    <div className="min-h-dvh bg-[#0c1014] text-white">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <PMOCorexLogo size={42} />

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/profile')}
              className="btn btn-ghost"
            >
              Profile
            </button>

            <button onClick={signOut} className="btn btn-ghost">
              <LogOut size={15} />
              Sign Out
            </button>
          </div>
        </div>

        <section className="relative overflow-hidden rounded-[2rem] border border-[#c49e48]/20 bg-gradient-to-br from-[#111820] via-[#162230] to-[#0f151c] p-8">
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#c49e48]/10 blur-3xl" />

          <div className="relative max-w-3xl">
            <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
              External Project Portal
            </div>

            <h1 className="text-4xl lg:text-5xl font-black tracking-tight">
              Welcome, {user?.full_name || user?.email || 'Partner'}
            </h1>

            <p className="text-slate-400 mt-4 max-w-2xl">
              Submit updates, upload documents, respond to assigned tasks, and
              communicate with the PMOCorex internal project team.
            </p>

            <div className="mt-5 text-sm text-slate-500">
              Role:{' '}
              <span className="text-[#c49e48]">
                {role || 'External User'}
              </span>{' '}
              • Project ID:{' '}
              <span className="text-[#c49e48]">
                {projectId || 'Not assigned'}
              </span>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <PortalCard
            icon={ClipboardList}
            title="My Assigned Tasks"
            description="View and update tasks assigned to your company or project role."
            onClick={() => navigate('/external-project/tasks')}
          />

         <PortalCard
  icon={UploadCloud}
  title="Submit Progress Update"
  description="Send daily or weekly progress updates for internal review."
  onClick={() =>
    navigate('/external-project/progress-report')
  }
/>

         <PortalCard
  icon={FolderUp}
  title="Upload Documents"
  description="Upload drawings, reports, photos, certificates, or supporting files."
  onClick={() => navigate('/external-project/documents')}
/>

          <PortalCard
            icon={FileText}
            title="Upload Report"
            description="Submit site reports, inspection notes, method statements, or progress reports."
          />

         <PortalCard
  icon={MessageSquare}
  title="Comments / RFIs"
  description="Raise questions, respond to comments, or submit RFIs to the project team."
  onClick={() => navigate('/external-project/rfis')}
/>

         <PortalCard
  icon={CheckCircle}
  title="Submission Status"
  description="Track whether your submitted items are pending, reviewed, approved, or rejected."
  onClick={() => navigate('/external-project/submissions')}
/>
        </section>
      </div>
    </div>
  )
}

function PortalCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: any
  title: string
  description: string
  onClick?: () => void
}) {
  return (
    <div className="card p-6 hover:border-[#c49e48]/30 transition">
      <div className="h-12 w-12 rounded-2xl border border-[#c49e48]/20 bg-[#c49e48]/10 flex items-center justify-center mb-5">
        <Icon size={22} className="text-[#c49e48]" />
      </div>

      <h2 className="text-lg font-bold text-[#ede8de]">{title}</h2>

      <p className="text-sm text-slate-500 mt-2 leading-relaxed">
        {description}
      </p>

      <button
        onClick={onClick}
        className="btn btn-ghost mt-5 w-full justify-center"
      >
        Open
      </button>
    </div>
  )
}
