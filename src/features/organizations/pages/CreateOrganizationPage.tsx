import { useNavigate } from 'react-router-dom';
import { OrganizationForm } from '../components/OrganizationForm';
import { useCreateOrganization } from '../hooks/useOrganizations';

export default function CreateOrganizationPage() {
  const navigate = useNavigate();
  const mutation = useCreateOrganization();

  return (
    <section className="mx-auto max-w-4xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Add organization</h1>
        <p className="text-sm text-slate-500">
          Create an external company profile before assigning projects and users.
        </p>
      </header>

      <div className="rounded-xl border bg-white p-6">
        <OrganizationForm
          submitting={mutation.isPending}
          onCancel={() => navigate('/internal/admin/organizations')}
          onSubmit={async (value) => {
            const organization = await mutation.mutateAsync(value);
            navigate(`/internal/admin/organizations/${organization.id}`);
          }}
        />
      </div>
    </section>
  );
}
