import type { ReactNode } from 'react'
import {
  Bot,
  CalendarDays,
  Database,
  Gauge,
  GitBranch,
  HelpCircle,
  Keyboard,
  Layers,
  Lock,
  PenLine,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Timer,
  Trophy,
  Wand2,
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

        <Faq id="marks" title="What are progress marks?" icon={<Trophy size={15} />}>
          <p>
            Marks are optional. Turn them on in <strong>Settings → Progress marks</strong>. They appear on the Progress
            page.
          </p>
          <p className="mt-2">
            A mark records a fact about work you finished: one task checked, the first checkpoint cleared, ten concepts
            mastered. It never counts days, streaks, sessions or time in the app.
          </p>
          <p className="mt-2">
            A missed day cannot take a mark away, and a pause does not reset one. The checklist stays the evidence; a
            mark is only a second way to read it.
          </p>
        </Faq>

        <Faq id="anki" title="How do I get cards into AnkiDroid?" icon={<Layers size={15} />}>
          <p>
            SkillMastery exports a real Anki file, not a screenshot of one. The TSV carries the separator, note type
            and deck name in its header, so the import needs almost no setup.
          </p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-4">
            <li>
              Open <strong>Practice → Deck</strong>. Clear the search and set both filters to <em>All weeks</em> and{' '}
              <em>All sources</em> — export uses the current filter.
            </li>
            <li>
              Press <strong>TSV</strong>. A file named <Code>skillmastery-&lt;short-name&gt;-YYYYMMDD.tsv</Code>{' '}
              downloads. Its header sets <Code>#separator:tab</Code>, <Code>#notetype:Basic</Code> and{' '}
              <Code>#deck:SkillMastery::&lt;short name&gt;</Code>.
            </li>
            <li>
              Move the file to the phone: <Code>adb push ~/Downloads/&lt;file&gt;.tsv /sdcard/Download/</Code>, or
              share it from the desktop and save it in Download.
            </li>
            <li>
              In AnkiDroid open the deck list, tap the <strong>⋮</strong> menu and choose <strong>Import</strong>{' '}
              (older versions say <strong>Import file</strong>). Pick the TSV from Download.
            </li>
            <li>
              On the import screen keep <strong>Tab</strong> as the separator and check the preview. Map column 1 to{' '}
              <strong>Front</strong>, column 2 to <strong>Back</strong> and column 3 to <strong>Tags</strong>. Map{' '}
              <strong>Source</strong> and <strong>Context</strong> to <em>Ignore</em> unless your note type has those
              fields.
            </li>
            <li>
              Confirm the import. Cards land in <Code>SkillMastery::&lt;short name&gt;</Code>; create that deck if
              AnkiDroid asks.
            </li>
          </ol>
          <p className="mt-2">
            The CSV button produces the same rows with a comma separator if a tool prefers CSV. AnkiDroid's labels
            move between versions — the preview is the source of truth.
          </p>
          <p className="mt-2">
            <strong>JSON is different.</strong> It never goes into AnkiDroid. Use{' '}
            <strong>Practice → Deck → Import JSON</strong> to bring generated cards back into SkillMastery; paste an
            array of objects with <Code>front</Code> and <Code>back</Code>.
          </p>
        </Faq>

        <Faq id="ai" title="How does the AI helper work?" icon={<Bot size={15} />}>
          <p>
            The AI helper is optional and off until you add a Velona key. It runs the prompt you are looking at
            against a fixed model, {`deepseek/deepseek-v4.1-flash-1017`}, through this app's same-origin{' '}
            <Code>/api/chat</Code> function.
          </p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-4">
            <li>
              Create a key at <a className="link" href="https://velona.in" target="_blank" rel="noreferrer">velona.in</a>.
              Usage is billed by Velona, not by this app.
            </li>
            <li>
              Open <strong>Settings → AI helper</strong>, paste the key and press <strong>Save key</strong>. The badge
              changes to <em>Key saved</em>.
            </li>
            <li>
              Open <strong>Practice → Prompts</strong>, pick a skill, choose the week to inject and press{' '}
              <strong>Run prompt</strong>.
            </li>
            <li>
              Read the answer, then copy what is worth keeping. Answers are not saved; only the prompt skill text is.
            </li>
          </ol>
          <p className="mt-2">
            Limits for a prompt skill: a rendered prompt must stay under 24,000 characters and an answer under 1,200
            tokens (600 by default, chosen in the run bar). There is one request in flight at a time, a 55-second
            upstream timeout, and no automatic retry. <strong>Cancel</strong> aborts the request you started.
          </p>
          <p className="mt-2">
            The key lives in this browser's localStorage. Pressing <strong>Run</strong> sends it to this app's own{' '}
            <Code>/api/chat</Code> proxy, which forwards it to Velona for that one request. It is never written into
            AppData, JSON backups, Obsidian exports or logs. Use <strong>Forget key</strong> to remove it. A rejected
            key shows an error; check the key in Settings.
          </p>
          <p className="mt-2">
            AI answers can be confidently wrong. Treat them as a tutor to interrogate, not an authority — check the
            claim against the docs before it becomes a card.
          </p>
        </Faq>

        <Faq id="week-cards" title="How is a week written?" icon={<PenLine size={15} />}>
          <p>
            Week 1 is written by hand. Seven cards explain the first Dart program, the money rule and the first push.
            They are not generated, and the app does not offer to replace them.
          </p>
          <p className="mt-2">
            For a later week, open <strong>Plan</strong>, then the week. Press <strong>Write the seven cards</strong>.
            The writer reads this week's blueprint, your earlier checkpoints and the failure modes you already met, so
            the week continues your course instead of starting a new one.
          </p>
          <p className="mt-2">
            A generated week is a draft. You see seven titles, the plan in minutes and anything the checker found. If a
            card breaks the prose standard, Save stays off until you discard the draft. Warnings about a timer, a
            forward reference or a missing artefact are advice, so read them before you save.
          </p>
          <p className="mt-2">
            The draft costs one request. Up to 120,000 characters go in, up to 8,000 tokens come back, and the upstream
            call stops at 280 seconds inside a 300-second function. Nothing is saved until you press{' '}
            <strong>Save the seven cards</strong>. <strong>Cancel</strong> or <strong>Discard</strong> writes nothing.
            Generated cards never earn credit; only a checked task does.
          </p>
        </Faq>

        <Faq id="prompts" title="Can I edit the prompt skills?" icon={<Wand2 size={15} />}>
          <p>
            Yes. Open <strong>Practice → Prompts</strong>, pick a skill and press <strong>Edit skill</strong>. The
            editor changes the instructions only; week context is still injected at copy or run time.
          </p>
          <p className="mt-2">
            Keep these variables where you want live data: <Code>{'{{track}}'}</Code>, <Code>{'{{week}}'}</Code>,{' '}
            <Code>{'{{weekNumber}}'}</Code>, <Code>{'{{anchor}}'}</Code>, <Code>{'{{kps}}'}</Code> and{' '}
            <Code>{'{{mistakes}}'}</Code>. Removing one simply leaves that text out.
          </p>
          <p className="mt-2">
            Edits are stored in AppData, so they are included in JSON backups, survive a reload and are undoable with{' '}
            <Kbd>Ctrl</Kbd> + <Kbd>Z</Kbd>. When a backup is merged, this device's edited version wins;{' '}
            <strong>Reset to original</strong> restores the authored template.
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
          <p className="mt-2">
            The backup includes your prompt-skill edits, resources, cards and progress. It explicitly excludes the
            Velona key — that belongs to the device, not the data file. Export first if a browser reset is coming.
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
            Curriculum, progress, notes, cards and prompt edits stay in this browser. There is no account, analytics,
            cloud sync or time tracking, and this app makes no telemetry requests.
          </p>
          <p className="mt-2">
            There is exactly one outbound action, and it is optional: pressing <strong>Run prompt</strong> sends that
            rendered prompt to Velona through this app's <Code>/api/chat</Code> function. The function forwards the
            request with your key and returns the answer; it does not write the prompt or key to app storage and does
            not log them. Vercel processes the request in transit like any HTTPS host.
          </p>
          <p className="mt-2">
            Your Velona key is held in this browser only. It is not in AppData, JSON backups, Obsidian exports, the
            service worker cache or this page's markup. Copying a prompt and importing a backup never touch the
            network.
          </p>
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
