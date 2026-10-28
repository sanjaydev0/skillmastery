# SkillMastery design system

This is the visual and interaction contract for the SkillMastery web app. Read it before adding a screen, a component, or a new colour. The executable source of truth is `src/index.css`; this document explains the intent and the rules behind those tokens.

**Last reviewed:** October 2026 (Phase 5: AI helper, editable prompt skills, AnkiDroid guidance).

---

## 1. What this product is

SkillMastery is a **control centre, not a classroom**.

It answers four questions and then gets out of the way:

1. What do I do today?
2. How long is it likely to take?
3. What is the next real piece of work?
4. Is the week actually finished?

The learner is a 13-year-old working on an 8 GB Linux laptop with Zed, the Flutter CLI and a physical Android phone. The UI has to be legible at arm's length, honest about effort, and calm enough to open every day for six months.

The design metaphor is **board and paper**:

- **Dark theme** — a deep green-black chalkboard with warm chalk text and one highlighter mark.
- **Light theme** — an exercise book: warm paper, ink-green text, one highlighter mark.

It should feel like a well-kept workbook, not a SaaS dashboard.

---

## 2. Principles

1. **One loud statement per page.** The page title or the single next action may be set in Fraunces at display size. Everything else is quiet.
2. **A ledger beats a card grid.** Related numbers share one ruled row (`.ledger`), not four identical boxes. Stats nested inside a sheet use `.mini-ledger`.
3. **One accent mark at a time.** The highlighter is reserved for what the learner should do next: the primary button, the active nav rule, today's column, the one current week. If two things on a screen are filled with accent, one of them is wrong.
4. **Show the shape of the work.** Days, ranges, capacity and checkpoints are visible. Nothing invents urgency with a timer, streak countdown, or red badge.
5. **Honest ranges, never false precision.** A task is `25–30 min`; a week is `9.9–12.3 h`; the course is a range. Do not collapse a range to a single number in display.
6. **The app points; it does not perform.** It links to the docs, the repo and the phone. It does not pretend to be the editor, the terminal, or AnkiDroid.
7. **Plain words for a 13-year-old.** Short sentences, concrete verbs, technical terms defined on first use. Depth lives behind “Go deeper”, not in the first paragraph.
8. **Material, not decoration.** No glows, gradients, glassmorphism, floating blobs or hover lifts. Borders and rules do the structural work.

---

## 3. Voice and copy

### Write like this

- Sentence case for labels, buttons, headings and table headers.
- Verbs first: “Mark done”, “Open the checkpoint”, “Add resource”.
- Name the object: “This week's plan”, not “Continue”.
- Explain the rule once: “Checking a task credits its whole estimate range.”
- Use “you” and “your”; the app speaks to one learner.
- Prefer a full stop to an exclamation mark. The product is encouraging, not manic.

### Avoid

- ALL-CAPS eyebrows or tracked-out labels. (`.eyebrow` is sentence case, 12px, weight 560.)
- Middle-dot meta strings: `Week 1 · Day 2 · Active`. Use a comma, a line break, or separate elements.
- `→` appended to link text. Arrows are allowed only when describing a real path: “Settings → Data”.
- Cute empty states (“Nothing to see here!”). Say what is missing and what to do.
- “Journey”, “unlock your potential”, “supercharge”, “10x”, “seamless”.
- Fake urgency: “Don't fall behind!”, “Day 4 of 7!”, countdowns, streak guilt.
- Time tracking language. The app never says “start”, “pause”, “session running” or “time left”.

### Numbers and dates

- A single task estimate: `formatEstimate()` → `25–30 min`.
- Any aggregate: `formatTotal()` → `9.9–12.3 h` or `85–105 min`.
- Use `num` (tabular numerals) on anything that sits in a column or ledger.
- Dates are written `28 October` or `Wed 28 Oct`, never `10/28/2026`.
- Weekdays on screen are Monday-first; the data model stores Sunday as `0`. See §14.

---

## 4. Typography

Two families only. Both are bundled locally through Fontsource; there is no runtime font request.

| Role | Family | How it is used |
| --- | --- | --- |
| Display | **Fraunces Variable** | The page's one loud statement: `.h1`, `.display`, a week number, the SRS ladder scale, a big empty-state title. |
| UI / body | **Instrument Sans Variable** | Navigation, buttons, labels, tables, paragraphs, forms, metadata. Everything you read while working. |
| Code | System mono | Only real code, CLI commands and keycaps. Not for data labels. |

### Scale

| Token | Size | Notes |
| --- | --- | --- |
| `.h1` | `clamp(1.75rem, 1.35rem + 1.5vw, 2.4rem)` | Fraunces, weight 560, line-height 1.02, tracking `-0.022em`. One per page. |
| `.display` | inherited | Fraunces with `SOFT 30, WONK 0`; used for the “Up next” statement and large numerals. |
| `.h2` | `1.02rem` | Section and card titles. Instrument Sans, weight 620. |
| Body | `15px / 1.6` | Default page text. |
| `.tiny` | `12px` | Dense metadata with a clear label. |
| Floor | `11px` | Nothing smaller, anywhere. 11px is for uppercase-free metadata only, never body copy. |

Rules:

- Do not set paragraphs in Fraunces. It is a display face, not a reading face.
- Do not use `font-mono` for stats, IDs or labels. Use tabular numerals (`.num`) instead.
- Keep weights between 400 and 650. The app has no black/900 weights.
- No letter-spacing on lowercase UI text. Tracking is only for real keycaps.
- Light theme text at 11px must use `--text-3` or darker. `--text-3` was darkened to `#69705f` for this reason.

---

## 5. Colour

All colour comes from CSS custom properties in `src/index.css`. Never hard-code a hex value in a component; add or use a token.

### Core tokens

| Token | Paper (light) | Board (dark) | Use |
| --- | --- | --- | --- |
| `--bg` | `#f4f1e7` | `#0e1411` | Page material |
| `--surface-1` | `#fffdf6` | `#141c17` | Sheets and cards |
| `--surface-2` | `#efebdd` | `#1a241e` | Nested rows, inputs, quiet fills |
| `--surface-3` | `#e5dfcd` | `#223028` | Rails, pressed states, stronger fills |
| `--border` | `#ddd6c4` | `#27332b` | Hairlines and sheet edges |
| `--border-strong` | `#bfb5a0` | `#3b4b3f` | Input borders, emphasized edges |
| `--text-1` | `#171b15` | `#f1efe3` | Primary text |
| `--text-2` | `#4d564b` | `#b5beb2` | Body secondary text |
| `--text-3` | `#69705f` | `#8a958b` | Metadata at 11px+, never body copy |
| `--accent` | `#7a6410` | `#e7dc7f` | The highlighter |
| `--accent-strong` | `#5f4d08` | `#f4ebb0` | Accent text on soft fills |
| `--accent-soft` | `#f3e7a4` | `rgb(231 220 127 / 0.12)` | Selected rows, today's column |
| `--accent-contrast` | `#fffdf6` | `#12170f` | Text on a filled accent button |

### Semantic colours

| Token | Meaning | Never use it for |
| --- | --- | --- |
| `--good` | Checkpoint cleared, task complete, healthy | Generic decoration |
| `--warn` | Capacity overload, capstone, honest caution | A task simply being unfinished |
| `--bad` | Real failure, destructive action, repair queue | Normal incomplete work |
| `--info` | Neutral supporting facts, new cards | Primary actions |

Each has a matching `-soft` fill. On dark, soft fills are 12–13% alpha of the foreground colour; on paper they are solid tints.

### Accent variants

The learner can choose `sky`, `emerald`, `violet` or `amber` when creating a track. The default highlighter is the mustard yellow. Variants exist in both themes and are declared next to the core tokens. A variant changes the highlighter only; semantic colours stay fixed.

`--swatch-sky`, `--swatch-emerald`, `--swatch-violet` and `--swatch-amber` preview each option in the create-track sheet. They are the only colour values a component may reference for a subject accent; never hard-code a variant hex in a component.

### Rules

- Exactly one accent-filled element per viewport section. The primary button, or the single active indicator. Not both.
- Never use pure black (`#000`) or pure white (`#fff`) as a surface.
- Do not tint large areas with accent. `--accent-soft` is for small selected states, not page backgrounds.
- Borders are always `var(--border)` unless the element is an input or a deliberately stronger edge.

---

## 6. Surfaces, shape and depth

| Element | Radius | Border | Shadow |
| --- | --- | --- | --- |
| Sheet / card (`.card`) | `10px` (`--radius-sheet`) | 1px `--border` | Paper: soft 24px ambient. Board: none. |
| Item / input / button | `8px` (`--radius-item`) | 1px | None |
| Chip / small button | `6px` (`--radius-chip`) | 1px when needed | None |
| Modal sheet | `20px` top corners on mobile, left corners on desktop | 1px | One deep shadow |

- Do not nest a card inside a card. If content needs grouping inside a sheet, use a ruled block (`.mini-ledger`), a border-top divider, or a `surface-2` row without its own border.
- `.ledger` is a single sheet with internal rules: 2 columns on mobile, 4 on ≥640px.
- `.mini-ledger` is a ruled strip inside a sheet: 2×2 on mobile, 4 across on ≥640px.
- No `translateY` hover lift. Hover changes `border-color` and, at most, `background`.
- Board theme has no card shadows; the border is the elevation.

---

## 7. Layout and responsive behaviour

### App shell

- Desktop sidebar: `252px` expanded, `76px` collapsed, fixed, `surface-1`, 1px right border.
- Sidebar header: `60px`. Mobile header: `56px + 56px` (title row + track/mode row).
- Desktop top bar: `60px`, sticky, `bg/85` with backdrop blur.
- Main page: `max-width: 1240px`, centred.
  - Mobile padding: `20px 16px 96px` plus safe-area bottom.
  - ≥768px: `28px 28px 48px`.
  - ≥1280px: `36px` side padding.
- Mobile bottom navigation has four tabs (Today, Plan, Practice, Progress) and a **More** sheet for Map, Library and Help.

### Breakpoints

| Width | What changes |
| --- | --- |
| `<640px` | Two-column ledgers; single-column cards; sheets slide from the bottom; controls become 44px tall. |
| `≥640px` | Ledgers go 4-up; two-column card grids appear. |
| `≥768px` | Desktop sidebar and top bar replace the mobile header. |
| `≥1024px` | 12-column `.bento` layouts; wide two-pane views (Practice, Prompts). |
| `≥1280px` | Wider page padding; the command-palette field appears in the top bar. |

### Touch and focus

- Below 768px, `.btn`, `.btn-sm`, `.icon-btn`, `.seg button`, `.input` and `.select` are forced to a 44px minimum height/width. Keep this override; do not “fix” a cramped mobile button by shrinking it.
- Every interactive element needs a visible focus state. The global `:focus-visible` is a 2px accent outline with 2px offset.
- Do not hide the only action behind hover. Hover may reveal a secondary action, never the primary one.

---

## 8. Components

### Buttons

| Variant | Use |
| --- | --- |
| `.btn-primary` | The single next action. Filled accent. |
| `.btn-soft` | A secondary action that belongs to the accent family. |
| `.btn-outline` | Neutral navigation or a second action beside a primary. |
| `.btn-ghost` | Tertiary action, inline toolbars. |
| `.btn-danger` | Destructive confirmation only, after an armed state. |

Sizes: default 38px, `.btn-sm` 30px, `.btn-lg` 44px. On mobile all become 44px tall. Icons are Lucide at 13–15px, `strokeWidth` 2 (2.4 only for the active nav icon).

### Check rows

`.check` is a full-width row: 19px rounded box, label, optional estimate meta. Checked state fills the box with accent, strikes the label and dims it. The entire row is the hit target. Always expose a real checkbox or an accessible button with `aria-pressed`/`aria-checked`.

### Badges and pills

- `.badge` — status, 11px, 4px radius, soft semantic fill. Use for `Ready`, `Locked`, `Capstone`, `Mistake`.
- `.pill` — metadata such as a week number or tag, 11.5px, full radius. Use sparingly; never as a fake button.
- Do not put two badges and two pills on one line unless the row is genuinely a status summary. When in doubt, use plain text separated by commas.

### Ledgers

Use `.ledger` when four facts describe one object (today, a week, the course, progress). Each cell is:

```
label (eyebrow, 12px)
value (num, 19px, weight 600)
meta (11px, text-3)
```

Do not add icons inside ledger cells. Do not wrap each cell in a card. Do not make the value larger than 19px; the page title is the loud element.

### Inputs

- Always pair an input with a `.label`; placeholders are examples, not labels.
- Focus uses the accent border plus `--ring`.
- Validation text sits below the field in `--bad`, not as a toast.
- Selects use the custom chevron built into `.select`; do not add a second icon.

### Sheets

- Mobile: bottom sheet, max `92dvh`, 20px top corners.
- Desktop: right-side panel, `min(620px, 92vw)`, 20px left corners.
- Sticky head, scrollable body, sticky foot with the primary action on the right.
- Backdrop is dark and blurred; `Esc` closes. Focus must be trapped while open.

### Empty states

`EmptyState` = one icon (17–18px), a short title, one sentence of explanation, one action. Do not use an illustration. Do not use a sad face.

### Toasts

One line, 13px, neutral sheet, semantic icon. Use for confirmations and non-blocking errors. Never use a toast for something the learner must act on.

### Progress

`.rail` is a 6px track with an accent bar; inside dense rows it can be 1–2px. Label the value in text next to it. A progress bar is never the only indication of completion.

---

## 9. Data display rules

These are product rules as much as visual ones.

- **No timers.** No clock, stopwatch, elapsed time, “time remaining”, or session countdown. Estimates are ranges, stated up front.
- **Checking a task credits the full range.** The UI may say “credits its estimate range”; never imply real elapsed time was measured.
- **Ranges stay ranges.** Use `formatEstimate` for a task, `formatTotal` for any sum. A `0 min` total is allowed; do not render `0–0 min`.
- **A day over capacity is a warning, not a failure.** Use `--warn`, not `--bad`. Say “over today's budget by 20 min”, never “failed”.
- **Locked means prerequisite, not punishment.** Use the neutral badge and explain the rule in one sentence.
- **The checkpoint is a blind rebuild.** Copy should say “without notes”, not “exam” or “quiz”.
- **Passive work always has an active output.** When showing a day, pair the read with the build. Do not let a day become all consumption.
- **The course total is an estimate range.** Label it “Estimate range, not a countdown”.

---

## 10. Motion

- 120–160ms for hover and press; 220ms for sheets; 320ms for progress width.
- Only `background`, `border-color`, `color`, `opacity`, `transform` and width animate.
- No parallax, no scroll-jacking, no decorative looping animation.
- `prefers-reduced-motion: reduce` collapses all durations to 0.01ms. Keep that block working.
- The only transform on press is a 1px downward nudge on buttons. Cards do not lift.

---

## 11. Accessibility

- Minimum text size: **11px**. Body copy is 13.5–15px.
- Light-theme metadata uses `--text-3: #69705f`; do not lighten it back to the old grey.
- Maintain at least 4.5:1 for body text and 3:1 for large text. When a tinted fill is used, check the text against that fill, not against the page.
- 44px minimum touch targets on mobile; 19px checkbox plus the full row label is acceptable because the row itself is the target.
- Every icon-only button has an `aria-label` and, on desktop, a `title`.
- Do not rely on colour alone: pair `Locked` with a lock icon, `Overdue` with text, `Mistake` with a label.
- `<details>` FAQs must keep their `<summary>` keyboard behaviour and visible focus.
- Decorative Lucide icons use `aria-hidden`. Meaningful icons need text nearby.
- The command palette and sheets close on `Esc`; focus returns to the trigger.

---

## 12. Iconography

- Lucide only. Sizes: 13–15px inline, 17px navigation, 18px empty states.
- Stroke width 2 by default; 2.4 only for the active navigation icon.
- Icons accompany text; they do not replace a label unless there is an `aria-label`.
- No emoji as UI. No custom SVG illustrations inside cards.
- The app mark is a `Target` glyph. `logo-mark` is currently an unstyled positioning hook; do not assume it draws a tile.

---

## 13. Screen notes

### Today

- `Up next` is the page's one loud statement: Fraunces, max ~46ch, accent rule in the left margin.
- Header actions are outline; `Mark done` is the only filled accent button.
- The ledger below carries left-today, week, reviews and course.
- Today's plan shows only today's tasks, the active/passive budget, and one sentence about estimate crediting.
- The seven-day strip is a ruled row of cells, not seven cards. Today's cell is accent-soft.

### Plan and week pages

- Week cards are register entries: number, status, title, planned/done, progress, project line. No second arrow, no chip layer.
- Week page: the h1 is the week theme; “the one idea” is a single left-ruled statement; capacity is a ledger; each day is a sheet with tasks.
- “Go deeper” is a closed disclosure at the bottom, not a wall of technical text above the fold.
- Git is a first-class line in every week: “Git habit” / “You build”.

### Map

- Nodes are graph entries, not marketing cards. Show status, week, prerequisites and knowledge points.
- Mastery is earned by a blind gate. Never show a manual “Mark mastered” button without the gate.
- Locked nodes explain the prerequisite; repair flags use `--bad` and a concrete drill.

### Practice

- “Answer from memory.” not “Study session”.
- The SRS ladder is a ruled scale (`1d 3d 6d 10d ∞`), not five fake buttons.
- Queue stats use `.mini-ledger`.
- Prompt skills are selected from the library. **Edit skill** opens a sheet with the full template, the available `{{variables}}` and a character count; the rendered prompt and injected week context are always visible before it is copied or run.
- Without a key, the run area is one info panel with **Add key**, never a dead **Run** button. With a key, the model, answer-size select, **Run prompt** and **Cancel** share one row; **Run prompt** is the only accent-filled action, so **Copy prompt** becomes outline.
- One request at a time, no automatic retries, no streaming. Show the prompt cap beside the rendered prompt and disable Run when it is exceeded.
- An AI answer is a plain transcript below the prompt, labelled **Not saved**, with **Copy answer** and a “check the docs” line. Do not mimic a chat thread or persist an answer.
- Deck export is TSV/CSV for AnkiDroid. JSON is for importing generated cards back into SkillMastery, never for AnkiDroid.

### Library

- One ruled index of resources, grouped by filter, not 41 stacked cards.
- Each row: kind icon, title, kind, week pill, one-line description, tags, reading status, edit/open.
- Books are a separate section: monogram, title, author, chapter progress.
- External links open only on explicit click. No prefetch, no embed, no tracking redirect.

### Progress

- Course ledger first, then phase sections with a single ruled sheet per phase.
- Week rows show estimate progress and checkpoint state; they do not repeat the full plan.
- Phase headers carry the human name and a one-line subtitle. “Phase 1 ·” is stripped in display.

### Help

- Short answers, no lectures. One `.card` per question, two columns on desktop.
- Every answer must name the actual screen path (`Settings → Data`) and the safe action.
- The setup answer must stay truthful to Zed + Flutter CLI + physical phone + 8 GB RAM.
- The AI answer names the model, the prompt and output caps, the one-in-flight rule, exactly what leaves the device, and how to forget the key. Never imply the app stores answers or spends silently.
- The AnkiDroid answer gives exact TSV steps: clear filters, export, move the file, import, map Front/Back/Tags, ignore Source/Context. Keep JSON re-import as a separate answer.

---

## 14. Implementation map

| Concern | File |
| --- | --- |
| Tokens, typography, components, motion, print | `src/index.css` |
| Shell, sidebar, top bar, mobile nav | `src/components/layout/AppShell.tsx` |
| Buttons, badges, ledger primitives, empty states | `src/components/ui/primitives.tsx` |
| Sheets and focus trap | `src/components/ui/Sheet.tsx` |
| Toasts | `src/components/ui/Toaster.tsx` |
| Route names and hash aliases | `src/lib/router.ts` |
| Estimate formatting | `src/engine/estimates.ts` |
| Weekday display helpers | `src/lib/dates.ts` |
| Seed content | `src/data/tracks/*.ts`, `src/data/curriculum/blueprint.ts` |
| PWA manifest colours | `vite.config.ts`, `index.html` |

---

## 15. Review checklist

Before calling a UI change done:

- [ ] Is there exactly one loud Fraunces statement on the screen?
- [ ] Is there exactly one accent-filled action (or none, if the screen is read-only)?
- [ ] Are related stats in a `.ledger`, not four cards?
- [ ] Is any text below 11px? If yes, fix it.
- [ ] Does every range use `formatEstimate` or `formatTotal` correctly?
- [ ] Is there any timer, countdown, streak guilt or “session running” language?
- [ ] Does the light theme still read on paper, and the dark theme on a board?
- [ ] Does it work at 390px with 44px targets?
- [ ] Are focus states visible and icon-only buttons labelled?
- [ ] Did you check it with `prefers-reduced-motion` and with the service worker cleared?

---

## 16. Known gaps

- The boot screen, browser chrome and PWA splash use duplicated colours: inline styles in `index.html`, the theme-colour update in `AppShell`, and `theme_color` / `background_color` in `vite.config.ts`. They are aligned with the board palette now, but must be changed together with the tokens.
- The Help FAQ is still a two-column card grid. It is acceptable for disclosure rows, but a ruled index is the preferred direction if it grows.
- Map and Library node cards keep a small number of rounded item surfaces. Do not add more without a reason.
- The AI runner has no streaming and no conversation history. Adding either means re-verifying the abort path and the 1,200-token cap; do not fake a chat UI in the meantime.

---

*If a rule here blocks a genuinely better idea, change the rule in this file and in `src/index.css` in the same commit. Do not leave a one-off exception in a component.*
