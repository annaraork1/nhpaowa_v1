import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { IconButton } from './IconButton.jsx';

/**
 * Portaled dialog so page tables/filters stay put and overflow cannot clip content.
 */
export function Modal({
  title,
  onClose,
  children,
  wide = false,
  footer = null,
}) {
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
            : 'w-full max-w-none sm:w-[min(92vw,560px)]'
        } flex max-h-[100dvh] flex-col overflow-hidden rounded-none border-0 shadow-lg sm:max-h-[90vh] sm:rounded-xl sm:border`}
        style={{
          backgroundColor: 'var(--panel)',
          borderColor: 'var(--line)',
          color: 'var(--ink)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
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
          className="flex-1 overflow-y-auto px-4 py-4 text-sm sm:px-5"
          style={{ color: 'var(--ink)' }}
        >
          {children}
        </div>
        {footer ? (
          <div className="flex shrink-0 flex-wrap gap-2 border-t border-line px-4 py-3 sm:px-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
