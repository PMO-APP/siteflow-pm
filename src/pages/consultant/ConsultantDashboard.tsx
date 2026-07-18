export default function ConsultantDashboard(){
return (
<div className="space-y-6">
<h1 className="text-2xl font-bold">Consultant Portal</h1>
<div className="grid grid-cols-2 gap-4">
<div className="rounded-xl border p-4">Pending Drawing Reviews</div>
<div className="rounded-xl border p-4">Awaiting Approvals</div>
<div className="rounded-xl border p-4">Open Technical Queries</div>
<div className="rounded-xl border p-4">Upcoming Meetings</div>
</div>
</div>
)
}
