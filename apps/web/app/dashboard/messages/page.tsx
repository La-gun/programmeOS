import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { WhatsAppContactQr } from '@/components/WhatsAppContactQr'
import { authOptions } from '@/lib/auth'
import { buildWhatsAppClickToChatUrl } from '@/lib/messaging/whatsapp-click-to-chat'
import { canManageParticipants } from '@/lib/permissions'

export default async function MessagesPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }

  const msisdnRaw = process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_MSISDN?.trim() ?? ''
  const prefill = process.env.NEXT_PUBLIC_WHATSAPP_CHAT_PREFILL?.trim()
  let chatUrl: string | null = null
  if (msisdnRaw) {
    try {
      chatUrl = buildWhatsAppClickToChatUrl(msisdnRaw, prefill || undefined)
    } catch {
      chatUrl = null
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Messages</h1>
        <p className="mt-2 text-slate-600">
          Conversations for your organisation will appear here.
        </p>
      </div>

      {canManageParticipants(session.user.role) ? (
        <p className="text-sm text-slate-600">
          <a
            href="/dashboard/whatsapp-test"
            className="font-medium text-emerald-800 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-950"
          >
            Open mobile QR test page
          </a>{' '}
          — ProgrammeOS login QR, WhatsApp QR, and step-by-step checklist.
        </p>
      ) : null}

      {canManageParticipants(session.user.role) && chatUrl ? (
        <WhatsAppContactQr chatUrl={chatUrl} />
      ) : canManageParticipants(session.user.role) ? (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          <p className="font-medium text-slate-800">WhatsApp QR (optional)</p>
          <p className="mt-2">
            Set <code className="rounded bg-white px-1 py-0.5 text-xs">NEXT_PUBLIC_WHATSAPP_BUSINESS_MSISDN</code>{' '}
            in your environment to the full international number of your WhatsApp Business line (digits only,
            e.g. <code className="rounded bg-white px-1 py-0.5 text-xs">447911123456</code>). This is the
            customer-facing number, not the Graph API <code className="rounded bg-white px-1 py-0.5 text-xs">phone_number_id</code>.
            Optionally set <code className="rounded bg-white px-1 py-0.5 text-xs">NEXT_PUBLIC_WHATSAPP_CHAT_PREFILL</code>{' '}
            for default message text in the composer.
          </p>
        </section>
      ) : null}
    </div>
  )
}
