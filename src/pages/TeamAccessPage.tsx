import { useEffect, useState } from 'react'
import {
  Users,
  Plus,
  Mail,
  Building2,
  Send,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'

const ROLES = [
  'admin',
  'pmo',
  'project_manager',
  'consultant',
  'housebuild',
  'infrastructure',
  'mep',
  'design',
'costing',
  'contractor',
  'viewer',
]

export default function TeamAccessPage() {
  const { user } = useAuthStore()

  const [organizations, setOrganizations] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [invites, setInvites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [organizationId, setOrganizationId] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('viewer')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)

    const [{ data: orgs }, { data: mems }, { data: invs, error }] =
      await Promise.all([
        supabase.from('organizations').select('*').order('created_at'),
        supabase
          .from('memberships')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('team_invitations')
          .select('*')
          .order('created_at', { ascending: false }),
      ])

    if (error) alert(error.message)

    setOrganizations(orgs || [])
    setMembers(mems || [])
    setInvites(invs || [])
    setLoading(false)
  }

  async function sendInvite() {
    if (!organizationId || !email || !role) {
      alert('Please complete all required fields.')
      return
    }

    setSending(true)

    const cleanEmail = email.toLowerCase().trim()
    const token = crypto.randomUUID()

    const { data, error } = await supabase
      .from('team_invitations')
      .insert({
        organization_id: Number(organizationId),
        email: cleanEmail,
        full_name: fullName.trim() || null,
        role,
        token,
        status: 'pending',
        invite_scope: 'workspace',
        access_scope: 'workspace',
        invited_by: user?.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single()

    if (error) {
      setSending(false)
      alert(error.message)
      return
    }

    const inviteLink = `${window.location.origin}/accept-invite?token=${data.token}`

    const { error: emailError } = await supabase.functions.invoke(
      'send-invite-email',
      {
        body: {
          email: cleanEmail,
          fullName: fullName.trim() || cleanEmail,
          role,
          inviteLink,
          invitedBy: user?.email || 'PMOCorex Admin',
        },
      }
    )

    if (emailError) {
      await navigator.clipboard.writeText(inviteLink)
      alert(
        `Invite created, but email failed to send. Link copied instead:\n${emailError.message}`
      )
    } else {
      alert('Invite created and email sent successfully.')
    }

    setShowModal(false)
    setOrganizationId('')
    setFullName('')
    setEmail('')
    setRole('viewer')
    setSending(false)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-[#c49e48]/20 bg-gradient-to-r from-[#111820] via-[#162230] to-[#111820] p-6">
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

          <button onClick={() => setShowModal(true)} className="btn-gold btn">
            <Plus size={15} />
            Invite Member
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Metric title="Organizations" value={organizations.length} icon={Building2} />
        <Metric title="Members" value={members.length} icon={Users} />
        <Metric
          title="Pending Invites"
          value={invites.filter(i => i.status === 'pending').length}
          icon={Send}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="card-head">
          <div>
            <div className="card-title">Pending Invitations</div>
            <div className="text-xs text-slate-500 mt-1">
              Users invited to join PMOCorex.
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
                  <th>Email</th>
                  <th>Full Name</th>
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
                      <td className="text-slate-300">{invite.email}</td>
                      <td className="text-slate-400">{invite.full_name || '—'}</td>

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
            <div className="card-title">Members</div>
            <div className="text-xs text-slate-500 mt-1">
              Accepted members with access.
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
                  <th>Email</th>
                  <th>Full Name</th>
                  <th>Role</th>
                  <th>Scope</th>
                </tr>
              </thead>

              <tbody>
                {members.map(member => (
                  <tr key={member.id}>
                    <td className="text-slate-300">{member.email || '—'}</td>
                    <td className="text-slate-400">{member.full_name || '—'}</td>
                    <td>
                      <span className="badge badge-muted capitalize">
                        {member.role?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="text-slate-500 text-xs">
                      {member.access_scope || '—'}
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
              <h2 className="text-lg font-bold text-white">Invite Member</h2>

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

            <label className="form-label">Full Name</label>
            <input
              className="form-control mb-4"
              placeholder="Full name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />

            <label className="form-label">Email Address</label>
            <div className="relative mb-4">
              <input
                className="form-control pl-9"
                type="email"
                placeholder="team@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />

              <Mail size={15} className="absolute left-3 top-3 text-slate-500" />
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
              disabled={sending}
              className="btn-gold btn w-full justify-center"
            >
              {sending ? 'Sending Invite…' : 'Send Email Invite'}
            </button>
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
          <div className="text-3xl font-black text-white">{value}</div>
          <div className="text-sm text-slate-500 mt-1">{title}</div>
        </div>

        <Icon size={22} className="text-[#c49e48]" />
      </div>
    </div>
  )
}
