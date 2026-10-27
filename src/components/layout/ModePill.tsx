import { BookOpen, Laptop } from 'lucide-react'
import type { Mode } from '../../types/schema'
import { useAppStore } from '../../store/AppStore'
import { cn } from '../../lib/utils'

export function ModePill({ labels = true, className }: { labels?: boolean; className?: string }) {
  const mode = useAppStore((state) => state.prefs.mode)
  const setMode = useAppStore((state) => state.setMode)

  const items: { id: Mode; label: string; icon: typeof BookOpen; title: string }[] = [
    {
      id: 'passive',
      label: 'Passive',
      icon: BookOpen,
      title: 'Passive mode: phone/shop — docs, canon, paper drills, Socratic sparring',
    },
    {
      id: 'active',
      label: 'Active',
      icon: Laptop,
      title: 'Active mode: PC/build — deep work, tests, polish, gate',
    },
  ]

  return (
    <div className={cn('seg', className)} role="group" aria-label="Study mode">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={mode === item.id}
            onClick={() => setMode(item.id)}
            title={item.title}
            className={labels ? '' : '!px-2'}
          >
            <Icon size={13} aria-hidden />
            {labels ? <span className="hidden lg:inline">{item.label}</span> : null}
            <span className="sr-only">{item.label} mode</span>
          </button>
        )
      })}
    </div>
  )
}
