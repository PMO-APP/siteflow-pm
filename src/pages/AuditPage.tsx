import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Log = {
  id: string
  created_at: string
  user_email: string
  action: string
  module: string
  record_id: string
  description: string
}

export default function AuditPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', {
        ascending: false
      })
      .limit(200)

    setLogs(data || [])
  }

  const filtered = logs.filter(
    l =>
      l.user_email
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||
      l.module
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||
      l.description
        ?.toLowerCase()
        .includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">

      <div className="card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-semibold text-white">
              Audit Trail
            </div>
            <div className="text-sm text-slate-400">
              System activity history
            </div>
          </div>

          <input
            className="form-control w-64"
            placeholder="Search logs..."
            value={search}
            onChange={e =>
              setSearch(e.target.value)
            }
          />
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-800 text-slate-400">
            <tr>
              <th className="text-left py-3 px-3">
                Time
              </th>
              <th className="text-left px-3">
                User
              </th>
              <th className="text-left px-3">
                Module
              </th>
              <th className="text-left px-3">
                Action
              </th>
              <th className="text-left px-3">
                Details
              </th>
            </tr>
          </thead>

          <tbody>
            {filtered.map(log => (
              <tr
                key={log.id}
                className="border-b border-slate-900"
              >
                <td className="py-3 px-3 text-slate-400">
                  {new Date(
                    log.created_at
                  ).toLocaleString()}
                </td>

                <td className="px-3">
                  {log.user_email}
                </td>

                <td className="px-3">
                  {log.module}
                </td>

                <td className="px-3">
                  {log.action}
                </td>

                <td className="px-3">
                  {log.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}
