import { useIsFetching, useIsMutating } from '@tanstack/react-query';

/**
 * Thin indeterminate bar while any TanStack Query fetch/mutation is in flight.
 * Mount once in Shell (and optionally on public routes).
 */
export function GlobalProgress({ className = '' }) {
  const fetching = useIsFetching({
    predicate: (q) => {
      const key = q.queryKey?.[0];
      // Keep header quiet for background pollers / typeahead
      if (key === 'alerts-unread' || key === 'global-search' || key === 'item-search') {
        return false;
      }
      return true;
    },
  });
  const mutating = useIsMutating();
  const active = fetching + mutating > 0;

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden ${className}`}
      role="status"
      aria-live="polite"
      aria-busy={active}
      aria-label={active ? 'Loading' : undefined}
    >
      {active ? (
        <div className="global-progress-bar h-full w-1/3 bg-brand" />
      ) : null}
    </div>
  );
}

/** Full-width sticky strip for public pages without Shell. */
export function GlobalProgressBanner() {
  return (
    <div className="relative h-0.5 w-full shrink-0 bg-transparent">
      <GlobalProgress />
    </div>
  );
}
