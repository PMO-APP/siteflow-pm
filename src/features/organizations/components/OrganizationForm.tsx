import { FormEvent, useState } from 'react';
import type { Organization } from '../types/organization.types';
import type { OrganizationInput } from '../services/organization.service';

interface Props {
  initialValue?: Partial<Organization>;
  submitting?: boolean;
  onSubmit: (value: OrganizationInput) => Promise<void> | void;
  onCancel?: () => void;
}

export function OrganizationForm({
  initialValue,
  submitting = false,
  onSubmit,
  onCancel,
}: Props) {
  const [form, setForm] = useState<OrganizationInput>({
    name: initialValue?.name ?? '',
    code: initialValue?.code ?? '',
    organization_type: initialValue?.organization_type ?? 'contractor',
    email: initialValue?.email ?? '',
    phone: initialValue?.phone ?? '',
    address: initialValue?.address ?? '',
    status: initialValue?.status ?? 'active',
  });

  function update<K extends keyof OrganizationInput>(key: K, value: OrganizationInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return;
    await onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm font-medium">Organization name</span>
          <input
            className="w-full rounded-lg border px-3 py-2"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            required
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium">Code</span>
          <input
            className="w-full rounded-lg border px-3 py-2"
            value={form.code ?? ''}
            onChange={(e) => update('code', e.target.value)}
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium">Type</span>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={form.organization_type}
            onChange={(e) =>
              update('organization_type', e.target.value as OrganizationInput['organization_type'])
            }
          >
            <option value="consultant">Consultant</option>
            <option value="contractor">Contractor</option>
            <option value="vendor">Vendor</option>
            <option value="client">Client</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium">Status</span>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={form.status}
            onChange={(e) => update('status', e.target.value as OrganizationInput['status'])}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium">Email</span>
          <input
            className="w-full rounded-lg border px-3 py-2"
            type="email"
            value={form.email ?? ''}
            onChange={(e) => update('email', e.target.value)}
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium">Phone</span>
          <input
            className="w-full rounded-lg border px-3 py-2"
            value={form.phone ?? ''}
            onChange={(e) => update('phone', e.target.value)}
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Address</span>
        <textarea
          className="min-h-24 w-full rounded-lg border px-3 py-2"
          value={form.address ?? ''}
          onChange={(e) => update('address', e.target.value)}
        />
      </label>

      <div className="flex justify-end gap-3">
        {onCancel && (
          <button type="button" className="rounded-lg border px-4 py-2" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Save organization'}
        </button>
      </div>
    </form>
  );
}
