import type { ReactNode } from 'react'
import {
  CalendarDays,
  Database,
  Gauge,
  GitBranch,
  HelpCircle,
  Keyboard,
  Lock,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Timer,
} from 'lucide-react'
import { useUiStore } from '../../store/uiStore'
import { navigate } from '../../lib/router'
import { Button, Kbd } from '../../components/ui/primitives'

export function HelpView() {
  const openPalette = useUiStore((state) => state.openPalette)

  return (
    <div>
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Short answers, no lectures</p>
          <h1 className="h1 mt-1">Help</h1>
          <p className="muted mt-1 max-w-2xl text-[13px]">
            SkillMastery is the control centre, not the classroom. It tells you what to do next, keeps the estimate
            honest and points you at the real work.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" icon={<Keyboard size={14} />} onClick={openPalette}>
            Search the app
          </Button>
          <Button variant="primary" size="sm" icon={<CalendarDays size={14} />} onClick={() => navigate('#/today')}>
            Go to today
          </Button>
        </div>
      </header>

      <section className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label="First steps">
        <Step n={1} title="Open Today" body="See the current week and only today's tasks." href="#/today" />
        <Step n={2} title="Do the next task" body="Read, build, break and explain. Check it when it is real." href="#/plan" />
        <Step n={3} title="Clear the checkpoint" body="Rebuild the week's work without notes to unlock the next week." href="#/progress" />
        <Step n={4} title="Back up" body="Export a JSON copy from Settings. Data lives only on this device." href="#/progress" />
      </section>

      {/* items-start stops a closed <details> from stretching to the height of
          the open one beside it and painting an empty card. */}
      <div className="mt-5 grid items-start gap-2 lg:grid-cols-2">
        <Faq
          id="today"
          title="How do I know what to do today?"
          icon={<CalendarDays size={15} />}
          defaultOpen
        >
          <p>
            <strong>Today</strong> reads the current week and shows the tasks scheduled for today's weekday. Days are
            numbered Monday (Day 1) through Sunday (Day 7).
          </p>
          <p className="mt-2">
            If today has no tasks, it is a buffer day: catch up, review cards, or open the week and pick the next
            unfinished task. Nothing is hidden.
          </p>
        </Faq>

        <Faq id="estimates" title="What do the time ranges mean?" icon={<Timer size={15} />}>
          <p>
            Every task carries an estimate range, such as <span className="num">60–75 min</span>. It is a planning
            hint, not a timer. The app never counts seconds or watches you work.
          </p>
          <p className="mt-2">
            Checking a task credits the <em>whole range</em> to today, the week and the course. Unchecking removes it.
            That is why totals are ranges too.
          </p>
          <p className="mt-2">
            A day over your capacity is flagged in the week plan. Move a task to another day or lower the estimate;
            do not pretend the day is longer.
          </p>
        </Faq>

        <Faq id="days" title="Why is each week split into seven days?" icon={<CalendarDays size={15} />}>
          <p>
            The week has a shape: Days 1–2 orient you, Days 3–4 build and debug, Day 5 tests, Day 6 applies the idea,
            and Day 7 is buffer plus checkpoint.
          </p>
          <p className="mt-2">
            Passive reading is always followed by an active output. Across the six months the balance shifts from
            roughly half passive to mostly active.
          </p>
        </Faq>

        <Faq id="capacity" title="How do I change my available time?" icon={<Gauge size={15} />}>
          <p>
            Open <a className="link" href="#/plan">Plan → Daily capacity</a>. Set weekday and weekend minutes for
            active work (building, debugging, testing) and passive work (reading, notes, videos).
          </p>
          <p className="mt-2">
            Capacity belongs to this device and is never replaced by an imported backup. Sunday is the default
            buffer day.
          </p>
        </Faq>

        <Faq id="undo" title="How do I undo a mistake?" icon={<RotateCcw size={15} />}>
          <p>
            Press <Kbd>Ctrl</Kbd> + <Kbd>Z</Kbd> (or <Kbd>⌘</Kbd> + <Kbd>Z</Kbd>) to undo the last content change.
            Add <Kbd>Shift</Kbd> to redo. The header buttons do the same on desktop; the More sheet has them on
            mobile.
          </p>
          <p className="mt-2">
            History is session-only and keeps the last 50 changes. Reloading the page clears it. Preferences and
            theme changes are not part of undo.
          </p>
        </Faq>

        <Faq id="locked" title="What does “locked” mean?" icon={<Lock size={15} />}>
          <p>
            A week or concept is locked when its prerequisites are not cleared yet. Weeks usually open after the
            previous week's blind checkpoint passes.
          </p>
          <p className="mt-2">
            If you deliberately want to jump ahead, open the week's <strong>Advanced workshop</strong> and unlock it.
            The override is visible, and clearing it restores the normal rule.
          </p>
        </Faq>

        <Faq id="checkpoints" title="How does a checkpoint pass?" icon={<Sparkles size={15} />}>
          <p>
            A checkpoint is a closed-book rebuild, not a quiz. Score four areas from 1 to 5: concept,
            implementation, craft and debugging.
          </p>
          <p className="mt-2">
            It passes when the average is at least 4.0 and no area is below 3. Attempts are logged with the date and
            average, so you can see progress instead of guessing.
          </p>
        </Faq>

        <Faq id="data" title="Where is my data, and how do I back it up?" icon={<Database size={15} />}>
          <p>
            Everything is stored in your browser's IndexedDB. There is no account, no analytics and no server copy.
            Clearing browser data or uninstalling the PWA deletes it.
          </p>
          <p className="mt-2">
            Open <strong>Settings → Data</strong> and export a JSON backup regularly. To move machines, import that
            file on the new device. An older schema is migrated automatically, with a raw pre-migration copy kept
            locally.
          </p>
        </Faq>

        <Faq id="reset" title="What happens when I reset progress?" icon={<RotateCcw size={15} />}>
          <p>
            A week reset clears checks, checkpoint attempts, concept status and card scheduling for that week only.
            Curriculum text, notes and IDs stay. Subject and full resets follow the same rule at a larger scope.
          </p>
          <p className="mt-2">
            Reset is undoable in the current session. For anything irreversible, export first. The full reset in
            Settings keeps your theme, mode and capacity.
          </p>
        </Faq>

        <Faq id="setup" title="What does this course assume on my machine?" icon={<Smartphone size={15} />}>
          <ul className="list-disc space-y-1 pl-4">
            <li>Zed as the editor, with the Flutter and Dart extensions.</li>
            <li>Flutter and Dart from the command line — no Android Studio.</li>
            <li>A physical Android phone over USB; no emulator.</li>
            <li>Chromium for the web preview, and Linux desktop for fast iteration.</li>
            <li>Git and a free GitHub account for saving each week's work.</li>
            <li>AnkiDroid on the phone for spaced repetition, plus this app's built-in review queue.</li>
          </ul>
          <p className="mt-2">
            The 8 GB RAM target is why the course avoids Android Studio and emulators. Keep one build running at a
            time and close unused browser tabs.
          </p>
        </Faq>

        <Faq id="git" title="How do I save my work to GitHub?" icon={<GitBranch size={15} />}>
          <p>Week 1 ends with a real repository. Set it up once on your machine:</p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-4">
            <li>
              Tell Git who you are:{' '}
              <Code>git config --global user.name "Your Name"</Code> and{' '}
              <Code>git config --global user.email "you@example.com"</Code>.
            </li>
            <li>Create an empty repository on GitHub and copy its HTTPS URL.</li>
            <li>
              In your project folder run <Code>git init</Code>, <Code>git add .</Code>,{' '}
              <Code>git commit -m "First Dart program"</Code>, <Code>git branch -M main</Code>,{' '}
              <Code>git remote add origin YOUR_URL</Code>, then <Code>git push -u origin main</Code>.
            </li>
          </ol>
          <p className="mt-2">
            When Git asks for a password, use a personal access token from GitHub, not your account password. Never
            paste a token into a file, a screenshot, or this app.
          </p>
          <p className="mt-2">
            Every later week ends with a commit and push. Week 2 adds a branch and a pull request; Week 24 adds a
            signed release tag.
          </p>
        </Faq>

        <Faq id="privacy" title="What leaves this device?" icon={<ShieldCheck size={15} />}>
          <p>
            Curriculum and progress stay local. The optional AI features are designed to send only the prompt you
            approve, through a server-side proxy — never your API key and never your full backup.
          </p>
          <p className="mt-2">The current build makes no analytics or telemetry requests.</p>
        </Faq>
      </div>

      <section className="card mt-4 p-3.5" aria-labelledby="shortcuts-heading">
        <div className="flex items-center gap-2">
          <Keyboard size={15} className="text-t2" aria-hidden />
          <h2 id="shortcuts-heading" className="h2">
            Keyboard
          </h2>
        </div>
        <dl className="mt-2 grid gap-x-4 gap-y-1.5 text-[12px] sm:grid-cols-2">
          <Shortcut keys={['Ctrl', 'K']} label="Search everything" />
          <Shortcut keys={['Ctrl', 'Z']} label="Undo the last change" />
          <Shortcut keys={['Ctrl', 'Shift', 'Z']} label="Redo" />
          <Shortcut keys={['Esc']} label="Close a panel or the palette" />
        </dl>
        <p className="faint mt-2 text-[11.5px]">On macOS, use ⌘ instead of Ctrl.</p>
      </section>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-s1 px-3.5 py-2.5">
        <p className="faint text-[11px]">Still unsure? Start with Today, then open the week's checkpoint.</p>
        <button type="button" className="link inline-flex items-center gap-1 text-[11px]" onClick={() => navigate('#/progress')}>
          See course progress
        </button>
      </div>
    </div>
  )
}

function Step({ n, title, body, href }: { n: number; title: string; body: string; href: string }) {
  return (
    <a href={href} className="card card-hover p-3">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-accent-soft text-[11px] font-bold text-accent-strong">
        {n}
      </span>
      <p className="mt-2 text-[12.5px] font-semibold">{title}</p>
      <p className="faint mt-0.5 text-[11.5px] leading-snug">{body}</p>
    </a>
  )
}

function Faq({
  id,
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  id: string
  title: string
  icon: ReactNode
  children: ReactNode
  defaultOpen?: boolean
}) {
  return (
    <details id={id} className="card overflow-hidden" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center gap-2.5 p-3.5 [&::-webkit-details-marker]:hidden">
        <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-s2 text-t2" aria-hidden>
          {icon}
        </span>
        <span className="min-w-0 flex-1 text-[12.5px] font-semibold">{title}</span>
        <HelpCircle size={14} className="flex-none text-t3" aria-hidden />
      </summary>
      <div className="border-t border-line px-3.5 py-3 text-[12.5px] leading-relaxed text-t2">{children}</div>
    </details>
  )
}

function Shortcut({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-line/70 pb-1.5 last:border-0">
      <dt className="faint">{label}</dt>
      <dd className="flex flex-none items-center gap-1">
        {keys.map((key) => (
          <Kbd key={key}>{key}</Kbd>
        ))}
      </dd>
    </div>
  )
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-s2 px-1 py-0.5 font-mono text-[11.5px] break-words text-t1">{children}</code>
  )
}
