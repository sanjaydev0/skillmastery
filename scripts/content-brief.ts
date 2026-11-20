import { readFileSync } from 'node:fs'
import { DEFAULT_JOURNEY } from '../src/types/schema'
import { flutterSubject } from '../src/data/tracks/flutter'
import {
  FLUTTER_BLUEPRINT,
  blueprintFor,
} from '../src/data/curriculum/blueprint'
import { authoredDayPlans, WEEK_CONTENT } from '../src/data/weeks'
import { paragraphs } from '../src/content/style'
import {
  buildGenerationPrompt,
  buildWeekBrief,
  GENERATION_MAX_TOKENS,
  GENERATION_PROMPT_MAX_CHARS,
  STYLE_CONTRACT,
} from '../src/engine/generation'

const raw = process.argv[2]
const weekNumber = Number(raw)

if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 24) {
  console.error('Usage: npm run content:brief -- <week-number>  (1–24)')
  process.exit(1)
}

const subject = flutterSubject
const week = subject.weeks.find((entry) => entry.weekNumber === weekNumber)
const blueprint = blueprintFor(subject.id, weekNumber)

if (!week || !blueprint) {
  console.error(`Week ${weekNumber} is not in the 24-week route.`)
  process.exit(1)
}

const target = `week-${String(weekNumber).padStart(2, '0')}`
const brief = buildWeekBrief(subject, week, DEFAULT_JOURNEY, {
  active: 720,
  passive: 420,
})
const plans = authoredDayPlans()
const prompt = buildGenerationPrompt(brief)

const source = readFileSync('docs/source/flutter-24-week-plan.txt', 'utf8')
const start = source.search(new RegExp(`^Week ${weekNumber}:`, 'm'))
const rest = start === -1 ? '' : source.slice(start)
// The heading itself matches /^Week \d+:/ at index 0, so search after its line.
const afterHeading = rest.slice(rest.indexOf('\n') + 1)
const following = afterHeading.search(/^Week \d+:/m)
const excerpt =
  start === -1
    ? '(source section not found)'
    : following === -1
      ? rest
      : rest.slice(0, rest.length - afterHeading.length + following)

const pad = (text: string) => text.replace(/^/gm, '  ')

const skeleton = [
  "import type { WeekContent } from '../types'",
  '',
  'const week: WeekContent = {',
  `  weekId: 'fl-w${weekNumber}',`,
  `  weekNumber: ${weekNumber},`,
  '  // Omit the checklist when the canonical task list is already authored.',
  '  // checklist: [ ... ],',
  '  dayPlans: [',
  ...[1, 2, 3, 4, 5, 6, 7].map(
    (day) =>
      `    { day: ${day}, title: '', summary: '', resources: [], tasks: [], direction: '', designNote: '', estMinutes: 0 },`,
  ),
  '  ],',
  '}',
  '',
  'export default week',
].join('\n')

const sections: string[] = []

sections.push(`# Context pack — Week ${weekNumber}`)
sections.push(`Write exactly one file: src/data/weeks/${target}/index.ts`)

sections.push(`## Blueprint for Week ${weekNumber}`)
sections.push(
  [
    `Theme: ${blueprint.theme}`,
    `Dart thread: ${blueprint.dart}`,
    `Flutter thread: ${blueprint.flutter}`,
    `Design thread: ${blueprint.design}`,
    `Artefact: ${blueprint.project}`,
    `Git habit: ${blueprint.git}`,
    `Checkpoint: ${blueprint.checkpoint}`,
    `Terms introduced: ${blueprint.termsIntroduced.join(', ') || 'none'}`,
    `Prerequisites: ${blueprint.prerequisites.join(', ') || 'none'}`,
    `Day focuses: ${blueprint.days.map((day, index) => `Day ${index + 1} — ${day}`).join('; ')}`,
    'Knowledge points:',
    ...blueprint.knowledgePoints.map(
      (point) => `  - ${point.primitive} → ${point.concept}. Failure: ${point.failureMode}`,
    ),
  ].join('\n'),
)

sections.push(`## Existing checklist for Week ${weekNumber}`)
for (const slot of [1, 2, 3, 4, 5, 6, 7]) {
  const items = week.checklist.filter((item) => item.day === slot)
  sections.push(
    `Day ${slot}:\n${items.length ? items.map((item) => `  - [${item.context}] ${item.label}`).join('\n') : '  (buffer day, no required task)'}`,
  )
}

const previous = WEEK_CONTENT.filter((content) => content.weekNumber < weekNumber).slice(-2)
sections.push('## Previous authored cards (do not repeat these openings)')
sections.push(
  previous.length
    ? previous
        .map((content) => {
          const cards = plans[content.weekId] ?? []
          return [
            `Week ${content.weekNumber}:`,
            ...cards.map(
              (card) =>
                `  Day ${card.day}: ${card.title}\n${pad(paragraphs(card.summary)[0] ?? '')}`,
            ),
          ].join('\n')
        })
        .join('\n\n')
    : 'No earlier authored cards yet.',
)

const next = blueprintFor(subject.id, weekNumber + 1)
sections.push('## Next week (set it up, but do not teach it)')
sections.push(
  next
    ? `Week ${next.weekNumber}: ${next.theme}\nArtefact: ${next.project}\nCheckpoint: ${next.checkpoint}`
    : 'This is the last week of the route.',
)

sections.push('## Term ledger')
sections.push(
  [
    `Before this week: ${FLUTTER_BLUEPRINT.filter((entry) => entry.weekNumber < weekNumber)
      .flatMap((entry) => entry.termsIntroduced)
      .join(', ') || 'none'}`,
    `This week: ${blueprint.termsIntroduced.join(', ') || 'none'}`,
    `After this week: ${FLUTTER_BLUEPRINT.filter((entry) => entry.weekNumber > weekNumber)
      .flatMap((entry) => entry.termsIntroduced)
      .join(', ') || 'none'}`,
  ].join('\n'),
)

sections.push('## Long-form course source')
sections.push(excerpt.trim())

sections.push('## Exact in-app generation prompt')
sections.push(
  [
    `${prompt.length} characters; cap ${GENERATION_PROMPT_MAX_CHARS.toLocaleString()}.`,
    `Output cap ${GENERATION_MAX_TOKENS.toLocaleString()} tokens.`,
    '',
    prompt,
  ].join('\n'),
)

sections.push('## Style contract')
sections.push(STYLE_CONTRACT)

sections.push('## File skeleton')
sections.push(skeleton)

console.log(sections.join('\n\n---\n\n'))
