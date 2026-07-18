export default function ContractorDashboard(){
return (
<div className="space-y-6">
<h1 className="text-2xl font-bold">Contractor Portal</h1>
<div className="grid grid-cols-2 gap-4">
<div className="rounded-xl border p-4">Today's Tasks</div>
<div className="rounded-xl border p-4">Open RFIs</div>
<div className="rounded-xl border p-4">Pending Inspections</div>
<div className="rounded-xl border p-4">Open Snags</div>
</div>
</div>
)
}
