import { useParams } from 'react-router-dom';
import {
  useOrganization,
  useOrganizationEngagements,
  useOrganizationInvitations,
  useOrganizationMembers,
  useOrganizationProjects,
} from '../hooks/useOrganizations';

export default function OrganizationDetailPage() {
  const { organizationId = '' } = useParams();
  const organization = useOrganization(organizationId);
  const members = useOrganizationMembers(organizationId);
  const projects = useOrganizationProjects(organizationId);
  const engagements = useOrganizationEngagements(organizationId);
  const invitations = useOrganizationInvitations(organizationId);

  if (organization.isLoading) return <div className="p-6">Loading organization...</div>;
  if (!organization.data) return <div className="p-6">Organization not found.</div>;

  return (
    <section className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">{organization.data.name}</h1>
        <p className="text-sm capitalize text-slate-500">
          {organization.data.organization_type} · {organization.data.status}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Members" value={members.data?.length ?? 0} />
        <SummaryCard label="Projects" value={projects.data?.length ?? 0} />
        <SummaryCard label="Engagements" value={engagements.data?.length ?? 0} />
        <SummaryCard label="Pending invitations" value={
          invitations.data?.filter((item) => item.status === 'pending').length ?? 0
        } />
      </div>

      <Panel title="Assigned projects">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className="py-2">Project</th>
              <th className="py-2">Portal role</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {(projects.data ?? []).map((item) => (
              <tr key={item.id} className="border-t">
                <td className="py-3">{item.project?.name ?? item.project_id}</td>
                <td className="py-3 capitalize">{item.portal_role}</td>
                <td className="py-3">{item.is_active ? 'Active' : 'Inactive'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Members">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className="py-2">Name</th>
              <th className="py-2">Email</th>
              <th className="py-2">Role</th>
            </tr>
          </thead>
          <tbody>
            {(members.data ?? []).map((item) => (
              <tr key={item.id} className="border-t">
                <td className="py-3">{item.profile?.full_name ?? 'Unnamed user'}</td>
                <td className="py-3">{item.profile?.email ?? '—'}</td>
                <td className="py-3 capitalize">{item.role.replaceAll('_', ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Engagements">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className="py-2">Title</th>
              <th className="py-2">Reference</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {(engagements.data ?? []).map((item) => (
              <tr key={item.id} className="border-t">
                <td className="py-3">{item.title}</td>
                <td className="py-3">{item.reference ?? '—'}</td>
                <td className="py-3 capitalize">{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Invitations">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className="py-2">Email</th>
              <th className="py-2">Role</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {(invitations.data ?? []).map((item) => (
              <tr key={item.id} className="border-t">
                <td className="py-3">{item.email}</td>
                <td className="py-3 capitalize">{item.role.replaceAll('_', ' ')}</td>
                <td className="py-3 capitalize">{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-white p-5">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}
