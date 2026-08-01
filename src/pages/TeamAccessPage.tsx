import { useEffect, useState } from 'react'
import {
  Users,
  Plus,
  Mail,
  Building2,
  Send,
  ShieldCheck,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useWorkspace } from '@/workspace/WorkspaceProvider'
import { EnterpriseMetric, EnterprisePageHero, EnterpriseSection } from '@/components/ui/enterprise/EnterprisePage'

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
  const { activeWorkspace } = useWorkspace()

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
    if (activeWorkspace?.id) load()
  }, [activeWorkspace?.id])

  async function load() {
    setLoading(true)

    if (!activeWorkspace?.id) {
      setOrganizations([]); setMembers([]); setInvites([]); setLoading(false)
      return
    }

    const [{ data: orgs }, { data: mems }, { data: invs, error }] =
      await Promise.all([
        supabase.from('organizations').select('*').eq('workspace_id', activeWorkspace.id).order('created_at'),
        supabase
          .from('memberships')
          .select('*')
          .eq('workspace_id', activeWorkspace.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('team_invitations')
          .select('*')
          .eq('workspace_id', activeWorkspace.id)
          .order('created_at', { ascending: false }),
      ])

    if (error) alert(error.message)

    setOrganizations(orgs || [])
    setMembers(mems || [])
    setInvites(invs || [])
    setLoading(false)
  }

  async function sendInvite() {
    if (!activeWorkspace?.id || !organizationId || !email || !role) {
      alert('Please complete all required fields.')
      return
    }

    setSending(true)

    const cleanEmail = email.toLowerCase().trim()
    const { data: existingInvite } = await supabase
  .from('team_invitations')
  .select('id')
  .eq('workspace_id', activeWorkspace.id)
  .eq('email', cleanEmail)
  .eq('status', 'pending')
  .maybeSingle()

if (existingInvite) {
  setSending(false)
  alert('This user already has a pending invitation.')
  return
}
    const token = crypto.randomUUID()

    const { data, error } = await supabase
      .from('team_invitations')
      .insert({
        workspace_id: activeWorkspace.id,
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

  const selectedOrganization = organizations.find(
  org => org.id === Number(organizationId)
)

const { error: emailError } = await supabase.functions.invoke(
  'send-invite-email',
  {
    body: {
      email: cleanEmail,
      fullName: fullName.trim() || cleanEmail,
      role,
      inviteLink,
      invitedBy:
        user?.user_metadata?.full_name ||
        user?.email ||
        'PMOCorex Admin',
      organizationName:
        selectedOrganization?.name || 'PMOCorex Workspace',
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
    <div className="min-h-screen bg-[#f6f5f1] text-[#18212b] -m-4 p-4 sm:-m-6 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-5">
      <EnterprisePageHero eyebrow="Workspace access" title="Team Access" description="Invite workspace members, assign organization-level roles and monitor outstanding invitations." actions={<button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#123a60] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d2e4d]"><Plus size={15}/>Invite member</button>} />

      <div className="grid gap-3 md:grid-cols-3">
        <EnterpriseMetric label="Organizations" value={organizations.length} helper="Available organizations" icon={Building2}/>
        <EnterpriseMetric label="Members" value={members.length} helper="Workspace memberships" icon={Users} tone="green"/>
        <EnterpriseMetric label="Pending invites" value={invites.filter(i => i.status === 'pending').length} helper="Awaiting acceptance" icon={Send} tone="coral"/>
      </div>

      <EnterpriseSection title="Pending invitations" description="Users invited to join PMOCorex and their current invitation status." action={<div className="rounded-xl bg-[#eaf1f7] p-2 text-[#123a60]"><ShieldCheck size={18}/></div>}>

        {loading ? (
          <div className="p-6 text-[#74818d]">Loading invites…</div>
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
                      <td className="text-[#26384a]">{invite.email}</td>
                      <td className="text-[#74818d]">{invite.full_name || '—'}</td>

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
      </EnterpriseSection>

      <EnterpriseSection title="Workspace members" description="Accepted members with active workspace access.">

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
                    <td className="text-[#26384a]">{member.email || '—'}</td>
                    <td className="text-[#74818d]">{member.full_name || '—'}</td>
                    <td>
                      <span className="badge badge-muted capitalize">
                        {member.role?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="text-[#87929b] text-xs">
                      {member.access_scope || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </EnterpriseSection>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-[#102943]/45 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#102943]">Invite Member</h2>

              <button
                onClick={() => setShowModal(false)}
                className="text-[#87929b] hover:text-[#102943]"
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

              <Mail size={15} className="absolute left-3 top-3 text-[#87929b]" />
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
              className="inline-flex items-center gap-2 rounded-xl bg-[#123a60] px-4 py-2.5 text-sm font-semibold text-white w-full justify-center"
            >
              {sending ? 'Sending Invite…' : 'Send Email Invite'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

