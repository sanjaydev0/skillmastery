import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

export function Sheet({
  title,
  eyebrow,
  onClose,
  children,
  footer,
  headerExtra,
  className,
}: {
  title: ReactNode
  eyebrow?: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  headerExtra?: ReactNode
  className?: string
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const titleId = useId()

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusables = (): HTMLElement[] => {
      const root = panelRef.current
      if (!root) return []
      return Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null)
    }

    const frame = window.requestAnimationFrame(() => {
      const target =
        panelRef.current?.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0] ?? panelRef.current
      target?.focus()
    })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        closeRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) {
        event.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = previousOverflow
      previous?.focus()
    }
  }, [])

  return createPortal(
    <>
      <div
        className="sheet-backdrop no-print"
        aria-hidden
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeRef.current()
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn('sheet no-print', className)}
      >
        <header className="sheet-head">
          <div className="min-w-0">
            {eyebrow ? <div className="eyebrow mb-1">{eyebrow}</div> : null}
            <h2 id={titleId} className="h1 text-[1.18rem] leading-tight">
              {title}
            </h2>
          </div>
          <div className="flex flex-none items-center gap-1.5">
            {headerExtra}
            <button type="button" className="icon-btn" onClick={() => closeRef.current()} aria-label="Close panel">
              <X size={17} />
            </button>
          </div>
        </header>
        <div className="sheet-body scroll-thin">{children}</div>
        {footer ? <footer className="sheet-foot">{footer}</footer> : null}
      </div>
    </>,
    document.body,
  )
}
