import { Link } from 'react-router-dom';
import { useOrganizations } from '../hooks/useOrganizations';

export default function OrganizationsPage() {
  const { data = [], isLoading, error } = useOrganizations();

  if (isLoading) return <div className="p-6">Loading organizations...</div>;
  if (error) return <div className="p-6">Unable to load organizations.</div>;

  return (
    <section className="space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Organizations</h1>
          <p className="text-sm text-slate-500">
            Manage consultants, contractors, vendors and clients.
          </p>
        </div>
        <Link
          to="/internal/admin/organizations/new"
          className="rounded-lg bg-black px-4 py-2 text-white"
        >
          Add organization
        </Link>
      </header>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {data.map((organization) => (
              <tr key={organization.id} className="border-t">
                <td className="px-4 py-3 font-medium">{organization.name}</td>
                <td className="px-4 py-3 capitalize">{organization.organization_type}</td>
                <td className="px-4 py-3">{organization.code || '—'}</td>
                <td className="px-4 py-3 capitalize">{organization.status}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/internal/admin/organizations/${organization.id}`}
                    className="font-medium underline"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-500">
            No organizations have been created yet.
          </div>
        )}
      </div>
    </section>
  );
}
