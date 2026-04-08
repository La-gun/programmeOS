'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type DocRow = {
  id: string
  name: string
  url: string
  createdAt: string | Date
  uploadedBy: { id: string; name: string | null; email: string } | null
  participant: {
    id: string
    user: { id: string; name: string | null; email: string }
  } | null
}

export default function DocumentsPageClient({
  mode,
  initialDocuments,
  participantOptions,
  defaultParticipantId
}: {
  mode: 'manager' | 'participant'
  initialDocuments: DocRow[]
  participantOptions: { id: string; label: string }[] | null
  defaultParticipantId: string | null
}) {
  const router = useRouter()
  const [documents, setDocuments] = useState(initialDocuments)
  const [participantId, setParticipantId] = useState(defaultParticipantId ?? '')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const refresh = async () => {
    const q =
      mode === 'participant' && participantId
        ? `?participantId=${encodeURIComponent(participantId)}`
        : ''
    const res = await fetch(`/api/documents${q}`)
    if (res.ok) {
      setDocuments((await res.json()) as DocRow[])
    }
  }

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.set('file', file)
      if (mode === 'participant') {
        const pid = participantId || defaultParticipantId
        if (!pid) {
          throw new Error('No enrolment to attach this file to.')
        }
        fd.set('participantId', pid)
      } else if (participantId.trim()) {
        fd.set('participantId', participantId.trim())
      }
      const res = await fetch('/api/documents/upload', { method: 'POST', body: fd })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body?.error || 'Upload failed.')
      }
      event.target.value = ''
      await refresh()
      router.refresh()
    } catch (e) {
      setError(String(e))
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (mode !== 'manager' || !confirm('Delete this document?')) {
      return
    }
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body?.error || 'Delete failed.')
      }
      await refresh()
      router.refresh()
    } catch (e) {
      setError(String(e))
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Upload</h2>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
          {mode === 'manager' && (
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500">Link to participant (optional)</label>
              <input
                value={participantId}
                onChange={(e) => setParticipantId(e.target.value)}
                placeholder="Participant ID"
                className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          )}
          {mode === 'participant' && (participantOptions?.length ?? 0) > 1 && (
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500">Enrolment</label>
              <select
                value={participantId}
                onChange={(e) => setParticipantId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                {participantOptions!.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
            {uploading ? 'Uploading…' : 'Choose file'}
          </label>
        </div>
      </div>

      {documents.length === 0 ? (
        <p className="text-sm text-gray-500">No documents yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Name</th>
                {mode === 'manager' && (
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                    Participant
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Uploaded</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documents.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{d.name}</td>
                  {mode === 'manager' && (
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {d.participant ? (
                        <a
                          href={`/dashboard/participants/${d.participant.id}`}
                          className="text-indigo-600 hover:text-indigo-500"
                        >
                          {d.participant.user.name || d.participant.user.email}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(d.createdAt).toLocaleString()}
                    {d.uploadedBy ? ` · ${d.uploadedBy.name || d.uploadedBy.email}` : ''}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <a
                      href={d.url}
                      className="font-medium text-indigo-600 hover:text-indigo-500"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download
                    </a>
                    {mode === 'manager' && (
                      <button
                        type="button"
                        onClick={() => handleDelete(d.id)}
                        className="ml-4 font-medium text-red-600 hover:text-red-500"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
