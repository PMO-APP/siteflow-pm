import { FormEvent, useState } from 'react'
import { X } from 'lucide-react'
import { useCreateOrganization } from '../hooks'
import type { OrganizationType } from '../types'

const TYPES: Array<{ value: OrganizationType; label: string }> = [
  { value: 'contractor', label: 'Contractor' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'architect', label: 'Architect' },
  { value: 'structural_consultant', label: 'Structural Consultant' },
  { value: 'mep_consultant', label: 'MEP Consultant' },
  { value: 'quantity_surveyor', label: 'Quantity Surveyor' },
  { value: 'external_project_manager', label: 'External Project Manager' },
  { value: 'consultant', label: 'Other Consultant' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'other', label: 'Other' },
]

export default function CreateOrganizationDialog({ onClose }: { onClose: () => void }) {
  const createMutation = useCreateOrganization()
  const [name, setName] = useState('')
  const [type, setType] = useState<OrganizationType>('consultant')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    await createMutation.mutateAsync({ name: name.trim(), organization_type: type, email, phone })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Add organization</h2>
            <p className="mt-1 text-sm text-slate-500">Create the external company before assigning projects and users.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-1.5 text-sm font-medium">
            Organization name
            <input className="rounded-lg border border-slate-300 bg-transparent px-3 py-2.5" value={name} onChange={e => setName(e.target.value)} required />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Type
            <select className="rounded-lg border border-slate-300 bg-transparent px-3 py-2.5" value={type} onChange={e => setType(e.target.value as OrganizationType)}>
              {TYPES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              Email
              <input type="email" className="rounded-lg border border-slate-300 bg-transparent px-3 py-2.5" value={email} onChange={e => setEmail(e.target.value)} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Phone
              <input className="rounded-lg border border-slate-300 bg-transparent px-3 py-2.5" value={phone} onChange={e => setPhone(e.target.value)} />
            </label>
          </div>
        </div>

        {createMutation.error && <p className="mt-4 text-sm text-red-600">{String(createMutation.error.message || createMutation.error)}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium">Cancel</button>
          <button disabled={createMutation.isPending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {createMutation.isPending ? 'Creating…' : 'Create organization'}
          </button>
        </div>
      </form>
    </div>
  )
}
