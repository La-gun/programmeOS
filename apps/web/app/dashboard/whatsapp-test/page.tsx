import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { DevicePhoneMobileIcon } from '@heroicons/react/24/outline'
import { EncodedUrlQr } from '@/components/EncodedUrlQr'
import { WhatsAppContactQr } from '@/components/WhatsAppContactQr'
import { authOptions } from '@/lib/auth'
import { buildAppEntryUrl, getPublicAppOrigin, originLooksLikeLocalhost } from '@/lib/app-public-url'
import { buildWhatsAppClickToChatUrl } from '@/lib/messaging/whatsapp-click-to-chat'
import { canManageParticipants } from '@/lib/permissions'

export const metadata = {
  title: 'Mobile QR (app + WhatsApp) | ProgrammeOS'
}

const steps = [
  {
    title: 'Configure the business number (this app)',
    body: (
      <>
        In <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">apps/web/.env.local</code> set{' '}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_WHATSAPP_BUSINESS_MSISDN</code>{' '}
        to your WhatsApp Business line as full international digits only (e.g.{' '}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">447911123456</code>). Restart{' '}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">pnpm dev</code>. Optional:{' '}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_WHATSAPP_CHAT_PREFILL</code>{' '}
        for prefilled composer text.
      </>
    )
  },
  {
    title: 'Expose webhook (Meta → ProgrammeOS)',
    body: (
      <>
        For live delivery into ProgrammeOS, Meta must reach your server: deploy or use a tunnel (ngrok,
        etc.). Set <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">META_APP_SECRET</code>,{' '}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">META_WEBHOOK_VERIFY_TOKEN</code>,{' '}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">MESSAGING_DEFAULT_TENANT_ID</code>, and
        point the WhatsApp webhook to{' '}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
          /api/webhooks/messaging/whatsapp
        </code>
        .
      </>
    )
  },
  {
    title: 'Scan the QR below',
    body: (
      <>
        Use your phone camera (or WhatsApp → linked devices is not required). The QR encodes a standard{' '}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">wa.me</code> link — it should open
        WhatsApp to your business chat.
      </>
    )
  },
  {
    title: 'Send a test message',
    body: (
      <>
        Use a phone number that matches a participant&apos;s WhatsApp channel address in ProgrammeOS (see
        seed data or participant profile). Otherwise the webhook may still receive the message but routing
        to the right participant depends on your data.
      </>
    )
  },
  {
    title: 'Confirm in ProgrammeOS',
    body: (
      <>
        Check the Messages area and messaging records in your database. If nothing appears, verify webhook
        delivery in Meta Developer → WhatsApp → Configuration, and server logs for{' '}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">401</code> / signature errors.
      </>
    )
  }
]

export default async function WhatsAppTestPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }
  if (!canManageParticipants(session.user.role)) {
    redirect('/dashboard')
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

  const envSnippet = `NEXT_PUBLIC_WHATSAPP_BUSINESS_MSISDN=447911123456
# optional:
NEXT_PUBLIC_WHATSAPP_CHAT_PREFILL=Hello, testing ProgrammeOS`

  const platformOrigin = getPublicAppOrigin()
  const platformLoginUrl = buildAppEntryUrl('/login')
  const platformLocalhost =
    platformOrigin !== null && originLooksLikeLocalhost(platformOrigin)

  return (
    <div className="mx-auto max-w-3xl space-y-10 pb-16">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
            <DevicePhoneMobileIcon className="h-7 w-7" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Mobile QR test</h1>
            <p className="mt-1 text-sm text-slate-600">
              One QR opens <strong>ProgrammeOS</strong> in the browser; another opens{' '}
              <strong>WhatsApp</strong> to your business line. Same checklist works for both flows.
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Test checklist</h2>
        <ol className="mt-4 list-decimal space-y-5 pl-5 text-sm text-slate-700 marker:font-semibold">
          {steps.map((s) => (
            <li key={s.title} className="pl-2">
              <span className="font-medium text-slate-900">{s.title}</span>
              <div className="mt-1.5 leading-relaxed text-slate-600">{s.body}</div>
            </li>
          ))}
        </ol>
      </section>

      {platformLoginUrl ? (
        <>
          {platformLocalhost ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <strong>Phones and “localhost”:</strong> this QR points at{' '}
              <code className="rounded bg-white/80 px-1 text-xs">{platformOrigin}</code>. On your
              phone, that usually means <em>the phone itself</em>, not your PC — so the page may not
              load. For a real phone test, set{' '}
              <code className="rounded bg-white/80 px-1 text-xs">NEXT_PUBLIC_APP_URL</code> to your{' '}
              <strong>deployed URL</strong>, <strong>ngrok / tunnel URL</strong>, or your computer&apos;s{' '}
              <strong>LAN IP</strong> (e.g. <code className="rounded bg-white/80 px-1 text-xs">http://192.168.1.10:3000</code>
              ).
            </div>
          ) : null}
          <EncodedUrlQr
            url={platformLoginUrl}
            size={320}
            title="Open ProgrammeOS (scan to sign in)"
            description="Scan with your phone camera. It opens this app’s sign-in page in the browser — same as bookmarking the site, but faster on mobile."
            className="border-2 border-indigo-300/60"
            variant="indigo"
            imgAlt="QR code to open ProgrammeOS login"
            linkTarget="_self"
          />
        </>
      ) : (
        <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-6">
          <h2 className="text-lg font-semibold text-amber-950">ProgrammeOS QR not available</h2>
          <p className="mt-2 text-sm text-amber-900/90">
            Set a public base URL so we know what to encode. Add one of these to{' '}
            <code className="rounded bg-amber-100/80 px-1 text-xs">apps/web/.env.local</code> and restart{' '}
            <code className="rounded bg-amber-100/80 px-1 text-xs">pnpm dev</code>:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-950">
            <li>
              <code className="rounded bg-white/80 px-1 text-xs">NEXT_PUBLIC_APP_URL=https://your-domain.com</code>{' '}
              (best for phones)
            </li>
            <li>
              or <code className="rounded bg-white/80 px-1 text-xs">NEXTAUTH_URL=...</code> (fallback;
              localhost won’t work from another device)
            </li>
          </ul>
        </section>
      )}

      {chatUrl ? (
        <WhatsAppContactQr
          chatUrl={chatUrl}
          size={320}
          title="Scan this QR with your phone"
          description="Hold steady at ~20–30 cm. Brightness up helps. If it opens a browser first, tap “Open in WhatsApp” if shown."
          className="border-2 border-emerald-300/60"
        />
      ) : (
        <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-6">
          <h2 className="text-lg font-semibold text-amber-950">WhatsApp QR not available yet</h2>
          <p className="mt-2 text-sm text-amber-900/90">
            Add your business MSISDN to the environment, then restart the dev server. The WhatsApp QR
            will appear here automatically.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-lg border border-amber-200/80 bg-white p-4 text-xs text-slate-800">
            {envSnippet}
          </pre>
          <p className="mt-3 text-xs text-amber-900/80">
            Replace <code className="rounded bg-amber-100/80 px-1">447911123456</code> with your real
            international number (digits only, no +).
          </p>
        </section>
      )}

      <p className="text-center text-xs text-slate-500">
        Tip for agents: this page path is{' '}
        <code className="rounded bg-slate-100 px-1.5 py-0.5">/dashboard/whatsapp-test</code>
      </p>
    </div>
  )
}
