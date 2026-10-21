import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  EyeIcon,
  NoSymbolIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Can } from '../auth/Can.jsx';
import { IconButton } from './IconButton.jsx';
import { ConfirmDelete } from './AlertDialog.jsx';

function ViewDialog({ title = 'Details', onClose, children, wide = false }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-stretch justify-center p-0 sm:items-center sm:p-4"
      style={{ backgroundColor: 'rgb(0 0 0 / 0.45)' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`${
          wide
            ? 'w-full max-w-none sm:w-[min(98vw,1120px)]'
            : 'w-full max-w-none sm:w-[min(92vw,480px)]'
        } flex max-h-[100dvh] flex-col overflow-hidden rounded-none border-0 shadow-lg sm:max-h-[90vh] sm:rounded-xl sm:border`}
        style={{
          backgroundColor: 'var(--panel)',
          borderColor: 'var(--line)',
          color: 'var(--ink)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3 sm:border-0 sm:px-5 sm:pb-0 sm:pt-5">
          <h3
            className="pr-2 text-base font-semibold sm:text-lg"
            style={{ color: 'var(--ink)' }}
          >
            {title}
          </h3>
          <IconButton label="Close" onClick={onClose}>
            <XMarkIcon className="h-5 w-5" />
          </IconButton>
        </div>
        <div
          className="flex-1 overflow-y-auto px-4 py-4 text-sm sm:px-5 sm:pb-5"
          style={{ color: 'var(--ink)' }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Permission-aware View / Edit / Deactivate / Delete icon row with delete confirmation.
 * View dialog is portaled to document.body so overflow tables cannot clip it.
 */
export function RowActions({
  resource,
  entityLabel,
  onView,
  onEdit,
  onDeactivate,
  onDelete,
  deletePending,
  deactivatePending,
  deactivateAction = 'createEdit',
  deactivateLabel = 'Deactivate',
  viewContent,
  viewTitle,
  viewWide = false,
  extras,
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const showView = Boolean(onView || viewContent);

  return (
    <>
      <div className="inline-flex items-center justify-end gap-0.5">
        {showView ? (
          <Can resource={resource} action="view">
            <IconButton
              label="View"
              onClick={() => {
                onView?.();
                if (viewContent) setViewOpen(true);
              }}
            >
              <EyeIcon className="h-5 w-5" />
            </IconButton>
          </Can>
        ) : null}
        {onEdit ? (
          <Can resource={resource} action="createEdit">
            <IconButton label="Edit" tone="brand" onClick={onEdit}>
              <PencilSquareIcon className="h-5 w-5" />
            </IconButton>
          </Can>
        ) : null}
        {extras}
        {onDeactivate ? (
          <Can resource={resource} action={deactivateAction}>
            <IconButton
              label={deactivateLabel}
              tone="danger"
              disabled={deactivatePending}
              onClick={onDeactivate}
            >
              <NoSymbolIcon className="h-5 w-5" />
            </IconButton>
          </Can>
        ) : null}
        {onDelete ? (
          <Can resource={resource} action="delete">
            <IconButton
              label="Delete"
              tone="danger"
              onClick={() => setConfirmOpen(true)}
            >
              <TrashIcon className="h-5 w-5" />
            </IconButton>
          </Can>
        ) : null}
      </div>

      <ConfirmDelete
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        entityLabel={entityLabel}
        loading={deletePending}
        onConfirm={() => {
          onDelete?.();
          setConfirmOpen(false);
        }}
      />

      {viewOpen && viewContent
        ? (
            <ViewDialog
              title={viewTitle || entityLabel || 'Details'}
              onClose={() => setViewOpen(false)}
              wide={viewWide}
            >
              {viewContent}
            </ViewDialog>
          )
        : null}
    </>
  );
}
