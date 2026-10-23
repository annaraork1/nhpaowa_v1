export function StatusBadge({ status }) {
  const map = {
    IN_STOCK: 'badge-ok',
    LOW_STOCK: 'badge-err',
    OUT_OF_STOCK: 'badge-err',
    DRAFT: 'badge-neutral',
    PENDING_APPROVAL: 'badge-warn',
    APPROVED: 'badge-brand',
    ORDERED: 'badge-brand',
    PARTIALLY_RECEIVED: 'badge-brand',
    RECEIVED: 'badge-ok',
    CLOSED: 'badge-neutral',
    CONVERTED: 'badge-brand',
    CANCELLED: 'badge-err',
    ACTIVE: 'badge-ok',
    EXPIRED: 'badge-err',
    RENEWED: 'badge-neutral',
    IN: 'badge-ok',
    OUT: 'badge-err',
  };
  const label =
    status === 'IN'
      ? 'Stock In'
      : status === 'OUT'
        ? 'Stock Out'
        : (status || '').replaceAll('_', ' ');
  return (
    <span className={`badge ${map[status] || 'badge-neutral'}`}>{label}</span>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold text-ink">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ message }) {
  return <div className="panel py-12 text-center text-muted">{message}</div>;
}

/** Show Loading… before EmptyState so lists don’t flash empty during fetch. */
export function QueryStatus({
  query,
  empty = 'Nothing here yet.',
  loading = 'Loading…',
  isEmpty,
}) {
  if (query?.isLoading || query?.isPending) {
    return (
      <div className="panel flex items-center justify-center gap-2 py-12 text-sm text-muted">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        {loading}
      </div>
    );
  }
  if (query?.isError) {
    return (
      <div className="panel py-12 text-center text-sm text-err">
        {query.error?.message || 'Could not load data. Try again.'}
      </div>
    );
  }
  const emptyCheck =
    typeof isEmpty === 'function'
      ? isEmpty(query?.data)
      : Array.isArray(query?.data)
        ? !query.data.length
        : query?.data == null;
  if (emptyCheck) {
    return <EmptyState message={empty} />;
  }
  return null;
}

/** Primary/ghost button label while a mutation runs. */
export function pendingLabel(isPending, idle, pending = 'Saving…') {
  return isPending ? pending : idle;
}

export function inr(n) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

export function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export function IconBox({ tone = 'blue', children }) {
  const tones = {
    blue: 'icon-box-brand',
    green: 'icon-box-ok',
    amber: 'icon-box-warn',
    red: 'icon-box-err',
  };
  return (
    <div
      className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}
    >
      {children}
    </div>
  );
}
