'use client'

import { useEffect, useState } from 'react'

type Variant = 'emerald' | 'indigo'

const variantStyles: Record<
  Variant,
  { section: string; link: string }
> = {
  emerald: {
    section: 'border-emerald-200 bg-emerald-50/40',
    link: 'text-emerald-800 decoration-emerald-400 hover:text-emerald-950'
  },
  indigo: {
    section: 'border-indigo-200 bg-indigo-50/40',
    link: 'text-indigo-800 decoration-indigo-400 hover:text-indigo-950'
  }
}

type Props = {
  url: string
  title: string
  description: string
  size?: number
  className?: string
  variant?: Variant
  imgAlt: string
  linkTarget?: '_blank' | '_self'
}

/**
 * QR code encoding any https? URL (ProgrammeOS login, wa.me, etc.).
 */
export function EncodedUrlQr({
  url,
  title,
  description,
  size = 220,
  className = '',
  variant = 'indigo',
  imgAlt,
  linkTarget = '_blank'
}: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const styles = variantStyles[variant]

  useEffect(() => {
    let cancelled = false
    setError(null)
    void import('qrcode')
      .then((QRCode) =>
        QRCode.toDataURL(url, {
          width: size,
          margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' }
        })
      )
      .then((data) => {
        if (!cancelled) {
          setDataUrl(data)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not generate QR code')
        }
      })
    return () => {
      cancelled = true
    }
  }, [url, size])

  const rel = linkTarget === '_blank' ? 'noopener noreferrer' : undefined

  return (
    <section className={`rounded-xl border p-6 shadow-sm ${styles.section} ${className}`}>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
      <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL from qrcode
          <img
            src={dataUrl}
            width={size}
            height={size}
            alt={imgAlt}
            className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm"
          />
        ) : (
          <div
            className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-sm text-slate-500"
            style={{ width: size, height: size }}
          >
            Generating…
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Encoded URL</p>
          <a
            href={url}
            target={linkTarget}
            rel={rel}
            className={`mt-1 break-all text-sm underline underline-offset-2 ${styles.link}`}
          >
            {url}
          </a>
        </div>
      </div>
    </section>
  )
}
