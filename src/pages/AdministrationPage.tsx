import { Link } from "react-router-dom";

export default function AdministrationPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Administration</h1>
        <p className="text-slate-500">
          Manage your SiteFlow workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

        <AdminCard
          title="Organizations"
          description="Consultants, contractors and vendors"
          to="/app/administration/organizations"
        />

        <AdminCard
          title="Users"
          description="Workspace members"
          to="/app/administration/users"
        />

        <AdminCard
          title="Invitations"
          description="Pending invites"
          to="/app/administration/invitations"
        />

        <AdminCard
          title="Roles & Permissions"
          description="Manage access"
          to="/app/administration/roles"
        />

        <AdminCard
          title="Workspaces"
          description="Workspace settings"
          to="/app/administration/workspaces"
        />

        <AdminCard
          title="Audit Log"
          description="System activity"
          to="/app/administration/audit"
        />

        <AdminCard
          title="Portfolios"
          description="Portfolio management"
          to="/app/administration/portfolios"
        />

        <AdminCard
          title="System Settings"
          description="Platform configuration"
          to="/app/administration/settings"
        />

      </div>
    </div>
  );
}

function AdminCard({
  title,
  description,
  to,
}: {
  title: string;
  description: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-xl border p-6 hover:shadow-lg transition"
    >
      <h2 className="font-semibold text-lg">{title}</h2>
      <p className="text-sm text-slate-500 mt-2">{description}</p>
    </Link>
  );
}
