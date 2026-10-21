import * as RadixAlertDialog from '@radix-ui/react-alert-dialog';

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  onConfirm,
  confirmTone = 'danger',
  loading = false,
}) {
  const confirmClass =
    confirmTone === 'danger'
      ? 'bg-danger text-white hover:opacity-90'
      : 'bg-brand text-white hover:bg-brand-soft';

  return (
    <RadixAlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixAlertDialog.Portal>
        <RadixAlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in" />
        <RadixAlertDialog.Content
          className="fixed left-1/2 top-1/2 z-[100] w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border p-5 shadow-lg outline-none"
          style={{
            backgroundColor: 'var(--panel)',
            borderColor: 'var(--line)',
            color: 'var(--ink)',
          }}
        >
          <RadixAlertDialog.Title
            className="text-lg font-semibold"
            style={{ color: 'var(--ink)' }}
          >
            {title}
          </RadixAlertDialog.Title>
          {description ? (
            <RadixAlertDialog.Description
              className="mt-2 text-sm"
              style={{ color: 'var(--muted)' }}
            >
              {description}
            </RadixAlertDialog.Description>
          ) : null}
          <div className="mt-5 flex justify-end gap-2">
            <RadixAlertDialog.Cancel asChild>
              <button type="button" className="btn-ghost" disabled={loading}>
                {cancelLabel}
              </button>
            </RadixAlertDialog.Cancel>
            <RadixAlertDialog.Action asChild>
              <button
                type="button"
                className={`btn ${confirmClass}`}
                disabled={loading}
                onClick={(e) => {
                  e.preventDefault();
                  onConfirm?.();
                }}
              >
                {loading ? 'Working…' : confirmLabel}
              </button>
            </RadixAlertDialog.Action>
          </div>
        </RadixAlertDialog.Content>
      </RadixAlertDialog.Portal>
    </RadixAlertDialog.Root>
  );
}

export function ConfirmDelete({
  open,
  onOpenChange,
  entityLabel = 'this item',
  onConfirm,
  loading,
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete permanently?"
      description={`This will remove ${entityLabel} from active lists (soft-delete). Confirm to continue or cancel to keep it.`}
      confirmLabel="Delete"
      confirmTone="danger"
      onConfirm={onConfirm}
      loading={loading}
    />
  );
}
