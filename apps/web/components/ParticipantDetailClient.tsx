'use client'

import type { ConsentType } from '@prisma/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import AiSuggestionsPanel from '@/components/AiSuggestionsPanel'

const CONSENT_TYPES: ConsentType[] = ['TERMS_OF_SERVICE', 'DATA_PROCESSING', 'MARKETING', 'RESEARCH']

const CONSENT_LABELS: Record<ConsentType, string> = {
  TERMS_OF_SERVICE: 'Terms of service',
  DATA_PROCESSING: 'Data processing',
  MARKETING: 'Marketing',
  RESEARCH: 'Research'
}

type CohortOption = {
  id: string
  name: string
  programme: { id: string; name: string }
}

type ParticipantDetail = {
  id: string
  userId: string
  status: string
  enrolledAt: string
  user: { id: string; name: string | null; email: string }
  cohort: CohortOption
  profile: {
    bio: string | null
    goals: string | null
    skills: string | null
    experience: string | null
  } | null
  consentRecords: Array<{
    id: string
    type: ConsentType
    consented: boolean
    consentedAt: string | null
    version: string
  }>
  statusEvents: Array<{
    id: string
    fromStatus: string | null
    toStatus: string
    note: string | null
    createdAt: string
    changedBy: { id: string; name: string | null; email: string } | null
  }>
  documents: Array<{
    id: string
    name: string
    url: string
    createdAt: string
    uploadedBy: { id: string; name: string | null; email: string } | null
  }>
}

type AuditRow = {
  id: string
  action: string
  entityType: string
  entityId: string
  createdAt: string
  details: unknown
  user: { id: string; name: string | null; email: string } | null
}

function formatDate(value: string | null) {
  if (!value) {
    return '—'
  }
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}

export default function ParticipantDetailClient({
  participant: initial,
  cohortOptions,
  isManager,
  canViewAudit,
  allowAiAssist
}: {
  participant: ParticipantDetail
  cohortOptions: CohortOption[]
  isManager: boolean
  canViewAudit: boolean
  allowAiAssist: boolean
}) {
  const router = useRouter()
  const [participant, setParticipant] = useState(initial)
  const [status, setStatus] = useState(initial.status)
  const [cohortId, setCohortId] = useState(initial.cohort.id)
  const [statusNote, setStatusNote] = useState('')
  const [bio, setBio] = useState(initial.profile?.bio ?? '')
  const [goals, setGoals] = useState(initial.profile?.goals ?? '')
  const [skills, setSkills] = useState(initial.profile?.skills ?? '')
  const [experience, setExperience] = useState(initial.profile?.experience ?? '')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [audit, setAudit] = useState<AuditRow[] | null>(null)
  const [uploading, setUploading] = useState(false)

  const consentVersions = useMemo(() => {
    const map = new Map<ConsentType, { version: string; consented: boolean }>()
    for (const c of participant.consentRecords) {
      map.set(c.type, { version: c.version, consented: c.consented })
    }
    return map
  }, [participant.consentRecords])

  const [consentDraft, setConsentDraft] = useState(() => {
    const d: Record<ConsentType, { version: string; checked: boolean }> = {} as typeof d
    for (const t of CONSENT_TYPES) {
      const existing = consentVersions.get(t)
      d[t] = {
        version: existing?.version ?? '1.0',
        checked: existing?.consented ?? false
      }
    }
    return d
  })

  useEffect(() => {
    const d: Record<ConsentType, { version: string; checked: boolean }> = {} as typeof d
    for (const t of CONSENT_TYPES) {
      const existing = consentVersions.get(t)
      d[t] = {
        version: existing?.version ?? '1.0',
        checked: existing?.consented ?? false
      }
    }
    setConsentDraft(d)
  }, [consentVersions])

  useEffect(() => {
    if (!canViewAudit || !isManager) {
      return
    }
    let cancelled = false
    ;(async () => {
      const res = await fetch(
        `/api/audit-events?entityType=Participant&entityId=${encodeURIComponent(participant.id)}&limit=50`
      )
      if (!res.ok || cancelled) {
        return
      }
      const data = (await res.json()) as AuditRow[]
      if (!cancelled) {
        setAudit(data)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [canViewAudit, isManager, participant.id])

  const refreshParticipant = async () => {
    const res = await fetch(`/api/participants/${participant.id}`)
    if (res.ok) {
      const next = (await res.json()) as ParticipantDetail
      setParticipant(next)
      setStatus(next.status)
      setCohortId(next.cohort.id)
      setBio(next.profile?.bio ?? '')
      setGoals(next.profile?.goals ?? '')
      setSkills(next.profile?.skills ?? '')
      setExperience(next.profile?.experience ?? '')
    }
  }

  const handleSaveDetails = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isManager) {
      return
    }
    setIsSaving(true)
    setError('')
    try {
      const response = await fetch(`/api/participants/${participant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          cohortId,
          statusNote: statusNote.trim() || undefined,
          profile: { bio, goals, skills, experience }
        })
      })
      if (!response.ok) {
        const body = await response.json()
        throw new Error(body?.error || 'Unable to save.')
      }
      const next = (await response.json()) as ParticipantDetail
      setParticipant(next)
      setStatusNote('')
      router.refresh()
    } catch (err) {
      setError(String(err))
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveConsent = async () => {
    setIsSaving(true)
    setError('')
    try {
      const items = CONSENT_TYPES.map((type) => ({
        type,
        consented: consentDraft[type].checked,
        version: consentDraft[type].version.trim() || '1.0'
      }))
      const response = await fetch(`/api/participants/${participant.id}/consent`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      })
      if (!response.ok) {
        const body = await response.json()
        throw new Error(body?.error || 'Unable to save consent.')
      }
      await refreshParticipant()
      router.refresh()
    } catch (err) {
      setError(String(err))
    } finally {
      setIsSaving(false)
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
      fd.set('participantId', participant.id)
      const response = await fetch('/api/documents/upload', { method: 'POST', body: fd })
      if (!response.ok) {
        const body = await response.json()
        throw new Error(body?.error || 'Upload failed.')
      }
      event.target.value = ''
      await refreshParticipant()
      router.refresh()
    } catch (err) {
      setError(String(err))
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!isManager || !confirm('Remove this participant from the cohort?')) {
      return
    }
    try {
      const response = await fetch(`/api/participants/${participant.id}`, { method: 'DELETE' })
      if (!response.ok) {
        const body = await response.json()
        throw new Error(body?.error || 'Unable to delete.')
      }
      router.push('/dashboard/participants')
      router.refresh()
    } catch (err) {
      setError(String(err))
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {allowAiAssist ? (
        <AiSuggestionsPanel scope={{ mode: 'participant', participantId: participant.id }} />
      ) : null}

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {participant.user.name || participant.user.email}
            </h2>
            <p className="text-sm text-gray-500">{participant.user.email}</p>
            <p className="mt-2 text-sm text-gray-600">
              Cohort:{' '}
              <Link
                href={`/dashboard/cohorts/${participant.cohort.id}`}
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                {participant.cohort.name}
              </Link>{' '}
              · {participant.cohort.programme.name}
            </p>
            <p className="text-sm text-gray-500">Enrolled {formatDate(participant.enrolledAt)}</p>
          </div>
          {isManager && (
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-md bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              Remove enrolment
            </button>
          )}
        </div>
      </section>

      {isManager ? (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Status & profile</h3>
          <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={handleSaveDetails}>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <input
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Cohort</label>
              <select
                value={cohortId}
                onChange={(e) => setCohortId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                {cohortOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.programme.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Status change note (optional)</label>
              <input
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Shown on the timeline with this update"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Goals</label>
              <textarea
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Skills</label>
              <textarea
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Experience</label>
              <textarea
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Profile</h3>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500">Status</dt>
              <dd className="font-medium capitalize text-gray-900">{participant.status}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-gray-500">Bio</dt>
              <dd className="text-gray-800">{participant.profile?.bio || '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-gray-500">Goals</dt>
              <dd className="text-gray-800">{participant.profile?.goals || '—'}</dd>
            </div>
          </dl>
        </section>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Consent</h3>
        <p className="mt-1 text-sm text-gray-500">
          Versions are stored per consent type. Updates are audited.
        </p>
        <ul className="mt-4 space-y-4">
          {CONSENT_TYPES.map((type) => (
            <li
              key={type}
              className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
                <input
                  type="checkbox"
                  checked={consentDraft[type].checked}
                  onChange={(e) =>
                    setConsentDraft((prev) => ({
                      ...prev,
                      [type]: { ...prev[type], checked: e.target.checked }
                    }))
                  }
                />
                {CONSENT_LABELS[type]}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Version</span>
                <input
                  value={consentDraft[type].version}
                  onChange={(e) =>
                    setConsentDraft((prev) => ({
                      ...prev,
                      [type]: { ...prev[type], version: e.target.value }
                    }))
                  }
                  className="w-24 rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={handleSaveConsent}
          disabled={isSaving}
          className="mt-4 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          Save consent
        </button>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Status timeline</h3>
        {participant.statusEvents.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No status changes yet.</p>
        ) : (
          <ol className="mt-4 space-y-3 border-l-2 border-indigo-100 pl-4">
            {participant.statusEvents.map((ev) => (
              <li key={ev.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-500" />
                <p className="text-sm text-gray-900">
                  <span className="font-medium capitalize">{ev.toStatus}</span>
                  {ev.fromStatus ? (
                    <span className="text-gray-500">
                      {' '}
                      from <span className="capitalize">{ev.fromStatus}</span>
                    </span>
                  ) : null}
                </p>
                {ev.note && <p className="text-sm text-gray-600">{ev.note}</p>}
                <p className="text-xs text-gray-400">
                  {formatDate(ev.createdAt)}
                  {ev.changedBy
                    ? ` · ${ev.changedBy.name || ev.changedBy.email}`
                    : ''}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
        <p className="mt-1 text-sm text-gray-500">Files are stored on the application server (see UPLOAD_DIR).</p>
        <div className="mt-4">
          <label className="inline-flex cursor-pointer items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
            {uploading ? 'Uploading…' : 'Upload file'}
          </label>
        </div>
        {participant.documents.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No documents yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-100">
            {participant.documents.map((doc) => (
              <li key={doc.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-gray-900">{doc.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(doc.createdAt)}
                    {doc.uploadedBy ? ` · ${doc.uploadedBy.name || doc.uploadedBy.email}` : ''}
                  </p>
                </div>
                <a
                  href={doc.url}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  target="_blank"
                  rel="noreferrer"
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canViewAudit && isManager && audit && audit.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Audit log (this participant)</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {audit.map((row) => (
              <li key={row.id} className="rounded-md bg-gray-50 px-3 py-2">
                <span className="font-medium text-gray-800">{row.action}</span>
                <span className="text-gray-500"> · {formatDate(row.createdAt)}</span>
                {row.user && (
                  <span className="text-gray-500"> · {row.user.name || row.user.email}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
