import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useUiStore } from '../../store/uiStore'
import { ToastIcon } from './primitives'

export function Toaster() {
  const toasts = useUiStore((state) => state.toasts)
  const dismiss = useUiStore((state) => state.dismissToast)

  if (toasts.length === 0) return null

  return createPortal(
    <div
      className="no-print pointer-events-none fixed right-4 bottom-[calc(84px+env(safe-area-inset-bottom))] z-[90] flex w-[min(380px,calc(100vw-32px))] flex-col gap-2 md:bottom-6"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="toast pointer-events-auto">
          <ToastIcon kind={toast.kind} />
          <p className="min-w-0 flex-1 leading-snug">{toast.message}</p>
          <button
            type="button"
            className="text-t3 hover:text-t1"
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  )
}
