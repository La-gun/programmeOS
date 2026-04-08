'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Cohort = {
  id: string
  name: string
  startDate: string | null
  endDate: string | null
}

type Template = {
  id: string
  name: string
  description: string | null
  order: number
  dueDays: number | null
}

type ProgrammeDetail = {
  id: string
  name: string
  description: string | null
  startDate: string | null
  endDate: string | null
  cohorts: Cohort[]
  milestoneTemplates: Template[]
}

export default function ProgrammeDetailClient({ programme }: { programme: ProgrammeDetail }) {
  const router = useRouter()
  const [name, setName] = useState(programme.name)
  const [description, setDescription] = useState(programme.description ?? '')
  const [startDate, setStartDate] = useState(programme.startDate ?? '')
  const [endDate, setEndDate] = useState(programme.endDate ?? '')
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [templateOrder, setTemplateOrder] = useState('1')
  const [templateDueDays, setTemplateDueDays] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editOrder, setEditOrder] = useState('1')
  const [editDueDays, setEditDueDays] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isTemplateSaving, setIsTemplateSaving] = useState(false)

  const formattedCohorts = useMemo(
    () => programme.cohorts,
    [programme.cohorts]
  )

  const handleUpdateProgramme = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/programmes/${programme.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, startDate, endDate })
      })

      if (!response.ok) {
        const body = await response.json()
        throw new Error(body?.error || 'Unable to update programme.')
      }

      router.refresh()
    } catch (err) {
      setError(String(err))
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateTemplate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsTemplateSaving(true)
    setError('')

    try {
      const response = await fetch('/api/milestone-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programmeId: programme.id,
          name: templateName,
          description: templateDescription,
          order: Number(templateOrder),
          dueDays: templateDueDays ? Number(templateDueDays) : undefined
        })
      })

      if (!response.ok) {
        const body = await response.json()
        throw new Error(body?.error || 'Unable to create milestone template.')
      }

      setTemplateName('')
      setTemplateDescription('')
      setTemplateOrder('1')
      setTemplateDueDays('')
      router.refresh()
    } catch (err) {
      setError(String(err))
    } finally {
      setIsTemplateSaving(false)
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Delete this milestone template?')) {
      return
    }

    try {
      const response = await fetch(`/api/milestone-templates/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const body = await response.json()
        throw new Error(body?.error || 'Unable to delete template.')
      }
      router.refresh()
    } catch (err) {
      setError(String(err))
    }
  }

  const startTemplateEdit = (template: Template) => {
    setSelectedTemplate(template)
    setEditName(template.name)
    setEditDescription(template.description ?? '')
    setEditOrder(String(template.order))
    setEditDueDays(template.dueDays?.toString() ?? '')
  }

  const cancelTemplateEdit = () => {
    setSelectedTemplate(null)
    setEditName('')
    setEditDescription('')
    setEditOrder('1')
    setEditDueDays('')
    setError('')
  }

  const handleSaveTemplate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedTemplate) {
      return
    }

    setIsTemplateSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/milestone-templates/${selectedTemplate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          order: Number(editOrder),
          dueDays: editDueDays ? Number(editDueDays) : undefined
        })
      })

      if (!response.ok) {
        const body = await response.json()
        throw new Error(body?.error || 'Unable to update template.')
      }

      cancelTemplateEdit()
      router.refresh()
    } catch (err) {
      setError(String(err))
    } finally {
      setIsTemplateSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Programme details</h2>
        <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={handleUpdateProgramme}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Start date</label>
            <input
              type="date"
              value={startDate ?? ''}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End date</label>
            <input
              type="date"
              value={endDate ?? ''}
              onChange={(event) => setEndDate(event.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSaving ? 'Updating...' : 'Save programme'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Cohorts</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {formattedCohorts.length === 0 ? (
            <p className="text-sm text-gray-500">No cohorts assigned yet.</p>
          ) : (
            formattedCohorts.map((cohort) => (
              <div key={cohort.id} className="rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900">{cohort.name}</h3>
                <p className="text-sm text-gray-500">{cohort.startDate || 'No start date'} – {cohort.endDate || 'No end date'}</p>
                <a
                  href={`/dashboard/cohorts/${cohort.id}`}
                  className="mt-3 inline-flex rounded-md bg-indigo-600 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  View cohort
                </a>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Milestone templates</h2>
        </div>

        <div className="mt-4 space-y-4">
          {programme.milestoneTemplates.length === 0 ? (
            <p className="text-sm text-gray-500">No milestone templates yet.</p>
          ) : (
            programme.milestoneTemplates.map((template) => (
              <div key={template.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-500">Order: {template.order} • Due in {template.dueDays ?? 'N/A'} days</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startTemplateEdit(template)}
                      className="rounded-md bg-slate-100 px-3 py-1 text-sm font-medium text-slate-800 hover:bg-slate-200"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="rounded-md bg-red-50 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {selectedTemplate?.id === template.id && (
                  <form className="mt-4 space-y-3 rounded-lg bg-slate-50 p-4" onSubmit={handleSaveTemplate}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <input
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Order</label>
                        <input
                          type="number"
                          value={editOrder}
                          onChange={(event) => setEditOrder(event.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          min={1}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <input
                          value={editDescription}
                          onChange={(event) => setEditDescription(event.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Due days</label>
                        <input
                          type="number"
                          value={editDueDays}
                          onChange={(event) => setEditDueDays(event.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          min={1}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isTemplateSaving}
                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        Save changes
                      </button>
                      <button
                        type="button"
                        onClick={cancelTemplateEdit}
                        className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ))
          )}
        </div>

        <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={handleCreateTemplate}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Order</label>
            <input
              type="number"
              value={templateOrder}
              onChange={(event) => setTemplateOrder(event.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              min={1}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <input
              value={templateDescription}
              onChange={(event) => setTemplateDescription(event.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Due days</label>
            <input
              type="number"
              value={templateDueDays}
              onChange={(event) => setTemplateDueDays(event.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              min={1}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isTemplateSaving}
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isTemplateSaving ? 'Saving...' : 'Create milestone template'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
