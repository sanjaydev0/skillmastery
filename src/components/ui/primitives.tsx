import type { ButtonHTMLAttributes, ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleDot,
  Loader2,
  Lock,
  RotateCcw,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react'
import type { NodeBadge } from '../../engine/gating'
import type { WeekStatus } from '../../types/schema'
import { cn, percent } from '../../lib/utils'

/* ---------------- buttons ---------------- */

type ButtonVariant = 'default' | 'primary' | 'soft' | 'outline' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  default: '',
  primary: 'btn-primary',
  soft: 'btn-soft',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
}

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
  trailingIcon?: ReactNode
}

export function Button({
  variant = 'default',
  size = 'md',
  loading = false,
  icon,
  trailingIcon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn('btn', VARIANT_CLASS[variant], SIZE_CLASS[size], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 size={15} className="animate-spin" aria-hidden /> : icon}
      {children}
      {trailingIcon}
    </button>
  )
}

export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" className={cn('icon-btn', className)} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  )
}

/* ---------------- badges ---------------- */

export type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'info' | 'accent'

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'badge-neutral',
  good: 'badge-good',
  warn: 'badge-warn',
  bad: 'badge-bad',
  info: 'badge-info',
  accent: 'badge-accent',
}

export function Badge({
  tone = 'neutral',
  children,
  className,
  icon,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
  icon?: ReactNode
}) {
  return (
    <span className={cn('badge', TONE_CLASS[tone], className)}>
      {icon}
      {children}
    </span>
  )
}

const WEEK_LABEL: Record<WeekStatus, string> = {
  locked: 'Locked',
  ready: 'Ready',
  'in-progress': 'In progress',
  mastered: 'Mastered',
}

const WEEK_TONE: Record<WeekStatus, Tone> = {
  locked: 'neutral',
  ready: 'accent',
  'in-progress': 'info',
  mastered: 'good',
}

const NODE_LABEL: Record<NodeBadge, string> = {
  locked: 'Locked',
  ready: 'Ready',
  learning: 'Learning',
  mastered: 'Mastered',
  'needs-repair': 'Needs repair',
}

const NODE_TONE: Record<NodeBadge, Tone> = {
  locked: 'neutral',
  ready: 'accent',
  learning: 'info',
  mastered: 'good',
  'needs-repair': 'bad',
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'mastered') return <CheckCircle2 size={11} aria-hidden />
  if (status === 'locked') return <Lock size={11} aria-hidden />
  if (status === 'needs-repair') return <Wrench size={11} aria-hidden />
  if (status === 'learning') return <CircleDot size={11} aria-hidden />
  if (status === 'in-progress') return <CircleDot size={11} aria-hidden />
  return <Sparkles size={11} aria-hidden />
}

export function WeekBadge({ status }: { status: WeekStatus }) {
  return (
    <Badge tone={WEEK_TONE[status]} icon={<StatusIcon status={status} />}>
      {WEEK_LABEL[status]}
    </Badge>
  )
}

export function NodeBadgePill({ status }: { status: NodeBadge }) {
  return (
    <Badge tone={NODE_TONE[status]} icon={<StatusIcon status={status} />}>
      {NODE_LABEL[status]}
    </Badge>
  )
}

export function ResourceBadge({ status }: { status: 'toRead' | 'reading' | 'done' }) {
  if (status === 'done') return <Badge tone="good">Read</Badge>
  if (status === 'reading') return <Badge tone="info">Reading</Badge>
  return <Badge tone="neutral">To read</Badge>
}

/* ---------------- progress ---------------- */

export function ProgressBar({
  value,
  tone = 'accent',
  className,
  label,
}: {
  value: number
  tone?: 'accent' | 'good' | 'warn' | 'bad'
  className?: string
  label?: string
}) {
  const width = Math.max(0, Math.min(100, percent(value)))
  const colour =
    tone === 'good'
      ? 'var(--good)'
      : tone === 'warn'
        ? 'var(--warn)'
        : tone === 'bad'
          ? 'var(--bad)'
          : 'var(--accent)'
  return (
    <div
      className={cn('rail', className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={width}
      aria-label={label ?? 'Progress'}
    >
      <span style={{ width: `${width}%`, background: colour }} />
    </div>
  )
}

export function ProgressRing({
  value,
  size = 56,
  stroke = 5,
  label,
  sublabel,
}: {
  value: number
  size?: number
  stroke?: number
  label?: ReactNode
  sublabel?: string
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const ratio = Math.max(0, Math.min(1, value))
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          style={{ transition: 'stroke-dashoffset 400ms ease' }}
        />
      </svg>
      <span className="absolute text-center leading-none">
        <span className="num block text-[13px] font-semibold">{label ?? `${percent(ratio)}%`}</span>
        {sublabel ? <span className="faint mt-0.5 block text-[9px] uppercase tracking-wide">{sublabel}</span> : null}
      </span>
    </div>
  )
}

/* ---------------- structure ---------------- */

export function SectionHead({
  title,
  eyebrow,
  action,
  description,
}: {
  title: ReactNode
  eyebrow?: string
  action?: ReactNode
  description?: ReactNode
}) {
  return (
    <div className="section-head">
      <div>
        {eyebrow ? <p className="eyebrow mb-1">{eyebrow}</p> : null}
        <h2 className="h2">{title}</h2>
        {description ? <p className="muted mt-1 text-[12.5px]">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function Stat({
  label,
  value,
  meta,
  icon,
  tone = 'neutral',
  onClick,
}: {
  label: string
  value: ReactNode
  meta?: ReactNode
  icon?: ReactNode
  tone?: Tone
  onClick?: () => void
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">{label}</span>
        {icon ? (
          <span className={cn('badge', TONE_CLASS[tone], '!p-1.5 !rounded-lg')} aria-hidden>
            {icon}
          </span>
        ) : null}
      </div>
      <div className="num mt-2 text-[1.45rem] font-semibold leading-none tracking-tight">{value}</div>
      {meta ? <div className="faint mt-1.5 text-[11.5px]">{meta}</div> : null}
    </>
  )
  if (onClick) {
    return (
      <button type="button" className="card card-pad card-hover text-left" onClick={onClick}>
        {content}
      </button>
    )
  }
  return <div className="card card-pad">{content}</div>
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  compact?: boolean
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'px-4 py-6' : 'px-4 py-12')}>
      {icon ? (
        <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl border border-line bg-s2 text-t3">
          {icon}
        </div>
      ) : null}
      <p className="text-[13.5px] font-semibold">{title}</p>
      {description ? <p className="muted mt-1 max-w-sm text-[12.5px]">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: { id: string; label: string; count?: number }[]
  value: string
  onChange: (id: string) => void
  className?: string
}) {
  return (
    <div className={cn('seg flex-wrap', className)} role="group">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={value === item.id}
          onClick={() => onChange(item.id)}
        >
          {item.label}
          {typeof item.count === 'number' ? (
            <span className="num ml-0.5 rounded-full bg-s3 px-1.5 text-[10.5px] text-t2">{item.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  )
}

/* ---------------- checklist ---------------- */

export function CheckRow({
  checked,
  onToggle,
  label,
  meta,
  children,
}: {
  checked: boolean
  onToggle: () => void
  label: ReactNode
  meta?: ReactNode
  children?: ReactNode
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      data-done={checked}
      className="check"
      onClick={onToggle}
    >
      <span className="check-box" aria-hidden>
        <Check size={13} strokeWidth={3} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="check-label block text-[13px] leading-snug">{label}</span>
        {meta ? <span className="faint mt-0.5 block text-[11px]">{meta}</span> : null}
        {children}
      </span>
    </button>
  )
}

/* ---------------- forms ---------------- */

export function Field({
  label,
  hint,
  children,
  className,
  error,
}: {
  label: string
  hint?: string
  children: ReactNode
  className?: string
  error?: string
}) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
      {error ? <p className="mt-1 text-[11.5px] text-bad">{error}</p> : null}
      {hint && !error ? <p className="faint mt-1 text-[11.5px]">{hint}</p> : null}
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line bg-s2 px-1.5 py-0.5 font-mono text-[10px] text-t2">{children}</kbd>
  )
}

export function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin" aria-label="Loading" />
}

export function Alert({
  tone = 'warn',
  icon,
  title,
  children,
  action,
}: {
  tone?: 'warn' | 'bad' | 'info'
  icon?: ReactNode
  title: ReactNode
  children?: ReactNode
  action?: ReactNode
}) {
  const classes =
    tone === 'bad'
      ? 'border-bad/30 bg-bad-soft'
      : tone === 'info'
        ? 'border-info/30 bg-info-soft'
        : 'border-warn/30 bg-warn-soft'
  const colour = tone === 'bad' ? 'text-bad' : tone === 'info' ? 'text-info' : 'text-warn'
  return (
    <div className={cn('rounded-xl border p-3.5', classes)}>
      <div className="flex items-start gap-2.5">
        <span className={cn('mt-0.5 flex-none', colour)}>
          {icon ?? <AlertTriangle size={16} aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('text-[13px] font-semibold', colour)}>{title}</p>
          {children ? <div className="muted mt-1 text-[12.5px] leading-relaxed">{children}</div> : null}
        </div>
        {action ? <div className="flex-none">{action}</div> : null}
      </div>
    </div>
  )
}

export function LinkArrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-medium text-accent">
      {children}
      <ArrowRight size={12} aria-hidden />
    </span>
  )
}

export function InlineError({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 flex items-start gap-1.5 text-[12px] text-bad" role="alert">
      <AlertTriangle size={13} className="mt-0.5 flex-none" aria-hidden />
      {children}
    </p>
  )
}

export function ToastIcon({ kind }: { kind: 'success' | 'error' | 'info' }) {
  if (kind === 'success') return <CheckCircle2 size={16} className="mt-0.5 flex-none text-good" aria-hidden />
  if (kind === 'error') return <AlertTriangle size={16} className="mt-0.5 flex-none text-bad" aria-hidden />
  return <Sparkles size={16} className="mt-0.5 flex-none text-accent" aria-hidden />
}

export function CloseX() {
  return <X size={16} aria-hidden />
}

export function RotateIcon() {
  return <RotateCcw size={13} aria-hidden />
}
