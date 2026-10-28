import type { PlannerSettings } from '../../types/schema'
import { useAppStore } from '../../store/AppStore'
import { dailyCapacity } from '../../engine/estimates'
import { cn } from '../../lib/utils'

function hoursLabel(minutes: number): string {
  const hours = minutes / 60
  if (Number.isInteger(hours)) return `${hours} h`
  return `${hours.toFixed(1)} h`
}

type CapacityField = 'weeklyActiveMinutes' | 'weeklyPassiveMinutes'

const ROWS: { key: CapacityField; label: string; hint: string }[] = [
  { key: 'weeklyActiveMinutes', label: 'Active', hint: 'Building, debugging, writing code' },
  { key: 'weeklyPassiveMinutes', label: 'Passive', hint: 'Reading docs, the book, your notes' },
]

/**
 * Two sliders, one promise: how many hours this week can actually hold.
 * The per-day figure underneath is arithmetic, not a second setting.
 */
export function CapacitySliders({
  className,
  showSummary = true,
}: {
  className?: string
  showSummary?: boolean
}) {
  const planner = useAppStore((state) => state.planner)
  const updatePlanner = useAppStore((state) => state.updatePlanner)
  const daily = dailyCapacity(planner)
  const days = planner.studyDays.length || 7

  return (
    <div className={cn('space-y-3.5', className)}>
      {ROWS.map((row) => {
        const value = planner[row.key]
        return (
          <label key={row.key} className="block">
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-[12.5px] font-medium">{row.label}</span>
              <span className="num text-[12.5px] font-semibold tracking-tight">
                {hoursLabel(value)}
                <span className="faint font-normal"> / week</span>
              </span>
            </span>
            <input
              type="range"
              min={0}
              max={2400}
              step={30}
              value={value}
              onChange={(event) => {
                const next = Number(event.target.value)
                if (Number.isFinite(next)) updatePlanner({ [row.key]: next } as Partial<PlannerSettings>)
              }}
              aria-label={`${row.label} hours per week`}
              aria-valuetext={`${hoursLabel(value)} per week`}
              className="mt-1.5"
            />
            <span className="faint mt-0.5 block text-[11px]">{row.hint}</span>
          </label>
        )
      })}
      {showSummary ? (
        <p className="faint border-t border-line pt-2 text-[11px] leading-snug">
          {hoursLabel(daily.active)} active + {hoursLabel(daily.passive)} passive on each of the{' '}
          {days} study {days === 1 ? 'day' : 'days'} you picked. Change those days in Settings, under Study week.
        </p>
      ) : null}
    </div>
  )
}
