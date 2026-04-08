'use client'

import { useEffect, useState } from 'react'

type AuditRow = {
  id: string
  action: string
  entityType: string
  entityId: string
  createdAt: string
  details: unknown
  user: { id: string; name: string | null; email: string } | null
}

function formatDate(value: string) {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}

export default function SettingsAuditClient() {
  const [rows, setRows] = useState<AuditRow[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetch('/api/audit-events?limit=200')
      if (cancelled) {
        return
      }
      if (!res.ok) {
        setError('Unable to load audit events.')
        return
      }
      setRows((await res.json()) as AuditRow[])
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>
  }
  if (!rows) {
    return <p className="text-sm text-gray-500">Loading audit log…</p>
  }
  if (rows.length === 0) {
    return <p className="text-sm text-gray-500">No audit events recorded yet.</p>
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">When</th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Action</th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Entity</th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Actor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-3 py-2 text-gray-600">{formatDate(r.createdAt)}</td>
              <td className="px-3 py-2 font-medium text-gray-900">{r.action}</td>
              <td className="px-3 py-2 text-gray-700">
                {r.entityType} <span className="text-gray-400">·</span>{' '}
                <code className="text-xs text-gray-600">{r.entityId}</code>
              </td>
              <td className="px-3 py-2 text-gray-600">{r.user ? r.user.name || r.user.email : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
