/**
 * Shared mobile/desktop list patterns:
 * - Cards below md for entity lists
 * - Sticky first column + horizontal scroll for comparison-heavy tables
 */

export function ResponsiveList({ mobile, desktop, className = '' }) {
  return (
    <>
      <div className={`space-y-2 md:hidden ${className}`.trim()}>{mobile}</div>
      <div className={`hidden md:block ${className}`.trim()}>{desktop}</div>
    </>
  );
}

export function EntityCard({
  title,
  subtitle,
  badge,
  avatar,
  fields = [],
  actions,
  className = '',
}) {
  return (
    <article
      className={`rounded-lg border border-line bg-surface/40 p-3 text-sm ${className}`.trim()}
    >
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {avatar ? <div className="shrink-0">{avatar}</div> : null}
          <div className="min-w-0 flex-1">
            {typeof title === 'string' ? (
              <p className="font-medium text-ink break-words">{title}</p>
            ) : (
              title
            )}
            {subtitle ? (
              typeof subtitle === 'string' ? (
                <p className="text-xs text-muted break-words">{subtitle}</p>
              ) : (
                subtitle
              )
            ) : null}
          </div>
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>
      {fields.length ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          {fields.map((f) =>
            f ? (
              <div key={f.label} className={f.span === 2 ? 'col-span-2' : undefined}>
                <dt className="text-muted">{f.label}</dt>
                <dd className="text-ink break-words">{f.value ?? '—'}</dd>
              </div>
            ) : null,
          )}
        </dl>
      ) : null}
      {actions ? (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-1 border-t border-line/60 pt-2">
          {actions}
        </div>
      ) : null}
    </article>
  );
}

/** Horizontal scroll with sticky first column — for comparison-heavy grids. */
export function StickyScrollTable({
  children,
  className = '',
  hint = 'Swipe sideways for more columns →',
  showHintOnMobile = true,
}) {
  return (
    <div className={className}>
      {showHintOnMobile ? (
        <p className="mb-2 text-xs text-muted md:hidden">{hint}</p>
      ) : null}
      <div
        className="overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label="Scrollable data table"
      >
        {children}
      </div>
    </div>
  );
}

/** Apply to first th/td so the identity column stays visible while scrolling. */
export const stickyColClass =
  'sticky left-0 z-10 bg-panel shadow-[2px_0_4px_-2px_rgba(0,0,0,0.12)]';
