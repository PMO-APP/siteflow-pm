import { useEffect, useState } from 'react'
import {
  Users,
  Plus,
  ShieldCheck,
  Mail,
  Building2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

const ROLES = [
  'owner',
  'admin',
  'project_manager',
  'consultant',
  'contractor',
  'viewer',
]

export default function TeamAccessPage() {
  const [organizations, setOrganizations] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [organizationId, setOrganizationId] = useState('')
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState('viewer')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)

    const [{ data: orgs }, { data: mems, error }] =
      await Promise.all([
        supabase
          .from('organizations')
          .select('*')
          .order('created_at'),

        supabase
          .from('organization_members')
          .select('*, organizations(name)')
          .order('created_at', {
            ascending: false,
          }),
      ])

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    setOrganizations(orgs || [])
    setMembers(mems || [])
    setLoading(false)
  }

  async function addMember() {
    if (!organizationId || !userId || !role) {
      alert('Please complete all fields')
      return
    }

    const { error } = await supabase
      .from('organization_members')
      .insert({
        organization_id: Number(organizationId),
        user_id: userId,
        role,
      })

    if (error) {
      alert(error.message)
      return
    }

    setShowModal(false)
    setOrganizationId('')
    setUserId('')
    setRole('viewer')
    load()
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-[#c49e48]/20 bg-gradient-to-r from-[#111820] via-[#162230] to-[#111820] p-6">
        <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-[#c49e48]/10 blur-3xl" />

        <div className="relative flex items-start justify-between gap-5">
          <div>
            <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
              Team Access
            </div>

            <h1 className="text-3xl font-black text-white">
              Manage organization access.
            </h1>

            <p className="text-slate-400 mt-2 max-w-2xl">
              Add users to organizations and assign roles for portfolio and project delivery control.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="btn-gold btn"
          >
            <Plus size={15} />
            Add Member
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Metric
          title="Organizations"
          value={organizations.length}
          icon={Building2}
        />

        <Metric
          title="Members"
          value={members.length}
          icon={Users}
        />

        <Metric
          title="Roles"
          value={ROLES.length}
          icon={ShieldCheck}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="card-head">
          <div>
            <div className="card-title">
              Organization Members
            </div>

            <div className="text-xs text-slate-500 mt-1">
              Control who can access each organization.
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-slate-400">
            Loading members…
          </div>
        ) : members.length === 0 ? (
          <div className="empty-state py-12">
            <div className="text-3xl mb-3">👥</div>
            <p>No organization members added yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>User ID</th>
                  <th>Role</th>
                  <th>Added</th>
                </tr>
              </thead>

              <tbody>
                {members.map(member => (
                  <tr key={member.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Building2
                          size={14}
                          className="text-[#c49e48]"
                        />
                        <span className="text-[#ede8de]">
                          {member.organizations?.name || 'Organization'}
                        </span>
                      </div>
                    </td>

                    <td className="font-mono text-xs text-slate-400">
                      {member.user_id}
                    </td>

                    <td>
                      <span className="badge badge-muted capitalize">
                        {member.role?.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="text-slate-500 text-xs">
                      {member.created_at
                        ? new Date(member.created_at)
                            .toLocaleDateString('en-GB')
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">
                Add Organization Member
              </h2>

              <button
                onClick={() => setShowModal(false)}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <label className="form-label">
              Organization
            </label>
            <select
              className="form-control mb-4"
              value={organizationId}
              onChange={e =>
                setOrganizationId(e.target.value)
              }
            >
              <option value="">
                Select organization
              </option>

              {organizations.map(org => (
                <option
                  key={org.id}
                  value={org.id}
                >
                  {org.name}
                </option>
              ))}
            </select>

            <label className="form-label">
              User ID
            </label>
            <div className="relative mb-4">
              <input
                className="form-control pl-9"
                placeholder="Paste Supabase user UUID"
                value={userId}
                onChange={e =>
                  setUserId(e.target.value)
                }
              />

              <Mail
                size={15}
                className="absolute left-3 top-3 text-slate-500"
              />
            </div>

            <label className="form-label">
              Role
            </label>
            <select
              className="form-control mb-5"
              value={role}
              onChange={e => setRole(e.target.value)}
            >
              {ROLES.map(item => (
                <option key={item} value={item}>
                  {item.replace('_', ' ')}
                </option>
              ))}
            </select>

            <button
              onClick={addMember}
              className="btn-gold btn w-full justify-center"
            >
              Add Member
            </button>

            <div className="text-xs text-slate-500 mt-4 leading-relaxed">
              For now, paste the user UUID from Supabase Authentication. Later, this can become a proper email invite flow.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Metric({ title, value, icon: Icon }: any) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-3xl font-black text-white">
            {value}
          </div>

          <div className="text-sm text-slate-500 mt-1">
            {title}
          </div>
        </div>

        <Icon size={22} className="text-[#c49e48]" />
      </div>
    </div>
  )
}
