import { useEffect, useState } from 'react'
import {
  Users,
  Plus,
  ShieldCheck,
  Mail,
  Building2,
  Send,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'

const ROLES = [
  'owner',
  'admin',
  'project_manager',
  'consultant',
  'contractor',
  'viewer',
]

export default function TeamAccessPage() {
  const { user } = useAuthStore()

  const [organizations, setOrganizations] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [invites, setInvites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [organizationId, setOrganizationId] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('viewer')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)

    const [
      { data: orgs },
      { data: mems },
      { data: invs, error },
    ] = await Promise.all([
      supabase.from('organizations').select('*').order('created_at'),
      supabase
        .from('organization_members')
        .select('*, organizations(name)')
        .order('created_at', { ascending: false }),
      supabase
        .from('organization_invites')
        .select('*, organizations(name)')
        .order('created_at', { ascending: false }),
    ])

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    setOrganizations(orgs || [])
    setMembers(mems || [])
    setInvites(invs || [])
    setLoading(false)
  }

  async function sendInvite() {
    if (!organizationId || !email || !role) {
      alert('Please complete all fields')
      return
    }

    const { data, error } = await supabase
      .from('organization_invites')
      .insert({
        organization_id: Number(organizationId),
        email: email.toLowerCase().trim(),
        role,
        invited_by: user?.id,
      })
      .select()
      .single()

    if (error) {
      alert(error.message)
      return
    }

    const inviteLink = `${window.location.origin}/accept-invite?token=${data.token}`

    await navigator.clipboard.writeText(inviteLink)

    alert(
      'Invite created. The invite link has been copied. Send it to the user by email or WhatsApp.'
    )

    setShowModal(false)
    setOrganizationId('')
    setEmail('')
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
              Invite your project team.
            </h1>

            <p className="text-slate-400 mt-2 max-w-2xl">
              Invite members by email and assign organization-level roles.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="btn-gold btn"
          >
            <Plus size={15} />
            Invite Member
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Metric title="Organizations" value={organizations.length} icon={Building2} />
        <Metric title="Members" value={members.length} icon={Users} />
        <Metric title="Pending Invites" value={invites.filter(i => i.status === 'pending').length} icon={Send} />
      </div>

      <div className="card overflow-hidden">
        <div className="card-head">
          <div>
            <div className="card-title">Pending Invitations</div>
            <div className="text-xs text-slate-500 mt-1">
              Users invited to join organizations.
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-slate-400">Loading invites…</div>
        ) : invites.length === 0 ? (
          <div className="empty-state py-12">
            <p>No invitations sent yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Invite Link</th>
                </tr>
              </thead>

              <tbody>
                {invites.map(invite => {
                  const link = `${window.location.origin}/accept-invite?token=${invite.token}`

                  return (
                    <tr key={invite.id}>
                      <td>{invite.organizations?.name || 'Organization'}</td>

                      <td className="text-slate-300">
                        {invite.email}
                      </td>

                      <td>
                        <span className="badge badge-muted capitalize">
                          {invite.role?.replace('_', ' ')}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            invite.status === 'accepted'
                              ? 'badge-green'
                              : 'badge-amber'
                          }`}
                        >
                          {invite.status}
                        </span>
                      </td>

                      <td>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(link)
                            alert('Invite link copied')
                          }}
                          className="tbl-action"
                        >
                          Copy Link
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="card-head">
          <div>
            <div className="card-title">Organization Members</div>
            <div className="text-xs text-slate-500 mt-1">
              Accepted members with access to organizations.
            </div>
          </div>
        </div>

        {members.length === 0 ? (
          <div className="empty-state py-12">
            <p>No members added yet.</p>
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
                    <td>{member.organizations?.name || 'Organization'}</td>

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
                        ? new Date(member.created_at).toLocaleDateString('en-GB')
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
                Invite Member
              </h2>

              <button
                onClick={() => setShowModal(false)}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <label className="form-label">Organization</label>
            <select
              className="form-control mb-4"
              value={organizationId}
              onChange={e => setOrganizationId(e.target.value)}
            >
              <option value="">Select organization</option>

              {organizations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>

            <label className="form-label">Email Address</label>
            <div className="relative mb-4">
              <input
                className="form-control pl-9"
                type="email"
                placeholder="team@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />

              <Mail
                size={15}
                className="absolute left-3 top-3 text-slate-500"
              />
            </div>

            <label className="form-label">Role</label>
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
              onClick={sendInvite}
              className="btn-gold btn w-full justify-center"
            >
              Create Invite Link
            </button>

            <div className="text-xs text-slate-500 mt-4 leading-relaxed">
              This creates a secure invite link. Email sending can be automated later with Supabase Edge Functions.
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
