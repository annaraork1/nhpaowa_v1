import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Notice / WhatsApp blast helper (channel 2) — no WhatsApp Business API.
 */
export default function FlatUpdateSharePage() {
  const [copied, setCopied] = useState(false);
  const formUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/flat-update';
    return `${window.location.origin}/flat-update`;
  }, []);

  const waText = encodeURIComponent(
    `NHPAOWA: Please update your flat details (no login needed).\nOpen: ${formUrl}\nEnter your tower number only — e.g. 21031 or T21031.`
  );
  const waHref = `https://wa.me/?text=${waText}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(formUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f3eef5] to-[#faf7fb] px-4 py-8 text-ink">
      <div className="mx-auto max-w-lg space-y-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">
          NHPAOWA
        </p>
        <h1 className="text-2xl font-bold">Share flat update link</h1>
        <p className="text-sm text-muted">
          Use this for tower WhatsApp groups and notice boards. Residents enter
          their tower number (e.g. 21031). No login. Staff: download per-flat
          links from Flat self-updates after signing in.
        </p>

        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <p className="break-all text-sm font-medium text-ink">{formUrl}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={copyLink}>
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <a
              className="btn-ghost inline-flex items-center"
              href={waHref}
              target="_blank"
              rel="noreferrer"
            >
              Open WhatsApp share
            </a>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5 text-sm shadow-sm">
          <p className="font-semibold">Suggested notice text</p>
          <p className="mt-2 text-muted">
            Dear resident — please update owner/tenant contacts for your flat.
            Open the link on your phone and enter your tower number only (e.g.
            21031 or T21031). No app install or password required. Your update
            goes to the association for review.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link className="btn-ghost" to="/flat-update">
            Open form
          </Link>
          <Link className="btn-ghost" to="/flat-update/paper">
            Paper form
          </Link>
          <Link className="btn-ghost" to="/login">
            Staff sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
