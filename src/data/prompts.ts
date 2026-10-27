import type { PromptTemplate } from '../types/schema'

export const SKILL_FORMULA = {
  line1: 'Deconstruct (Primitives) + Active Generation (Paper) + Deliberate Practice (PC)',
  line2: 'Mastery Velocity = (Scaffolded Primitives × High-Signal Exposure × Retrieval Friction) ÷ (Working-Memory Overload + Feedback Latency)',
  note: 'Generate on paper before reading the solution. Retrieve without lookup. Advance only through a blind gate.',
}

export const PROMPTS: PromptTemplate[] = [
  {
    id: 'socratic-tutor',
    title: 'Socratic mental-model interrogation',
    description: 'Audit what you think you know, then force yourself to find the missing piece.',
    category: 'socratic',
    tags: ['passive', 'shop', 'phone', 'tutor'],
    template: `Act as a principal engineer and cognitive scientist. Do NOT give me code solutions or write boilerplate for me.

I am in my passive shop window studying {{week}} — "{{anchor}}" in the {{track}} track.

Here is my current mental model of how it works under the hood:
[insert voice-to-text or typed explanation]

1. Audit my mental model. Where is it mechanically, architecturally, or memory-wise inaccurate?
2. What edge case or runtime scenario breaks my assumption?
3. Ask me three sequential diagnostic questions, one at a time, to force me to discover the missing piece myself.
4. End by naming the one primitive I should re-read before my PC block tonight.`,
  },
  {
    id: 'paper-code-grader',
    title: 'Paper-code & widget-tree grader',
    description: 'Strict compiler + layout engine review of handwritten work before it reaches the IDE.',
    category: 'review',
    tags: ['passive', 'paper', 'compiler', 'layout'],
    template: `Act as a strict compiler, static analyzer, and senior reviewer. Do NOT rewrite my code for me.

I wrote this by hand in my notebook without an IDE:
[paste transcription or attach a photo]

1. Static analysis: point out line-by-line syntax, null-safety, and type errors — but make me state the fix.
2. Trace the constraints: for each layout, walk constraints down and sizes up. Will this throw an unbounded-constraint or overflow error?
3. Check the core invariants for {{week}}: {{kps}}
4. Grade my paper architecture 1–5 for readiness for a 60-minute PC block, and list the single riskiest line to verify first.`,
  },
  {
    id: 'design-critique',
    title: 'Staff UI/UX critique',
    description: 'Hierarchy, 8pt grid, all UI states, and accessibility — without redesigning it for you.',
    category: 'design',
    tags: ['design', 'wireframe', 'accessibility', 'm3'],
    template: `Act as a staff product designer specialising in Material 3, HIG, Gestalt psychology, and accessibility. Do not redesign the screen for me.

Review my handwritten wireframe or layout description for [screen name] in {{week}}:
{{anchor}}

1. Audit visual hierarchy, 8pt grid alignment, optical balance, and touch-target sizing (minimum 48dp).
2. Identify the missing UI states: idle, loading, empty, error, offline, partial data.
3. Audit the accessibility tree: announcement order, contrast ratios, focus traps, text scaling.
4. Give me three concrete design questions I must resolve on paper before opening the IDE.`,
  },
  {
    id: 'adversarial-reviewer',
    title: 'Adversarial PR reviewer',
    description: 'Production-grade review after the deep-work block. Finds leaks, jank, and leaky boundaries.',
    category: 'review',
    tags: ['active', 'code-review', 'performance', 'security'],
    template: `Act as a principal security and performance engineer. Do NOT refactor my code for me.

Here is the code I wrote during today's deep-work block for {{week}}:
[paste the diff]

Audit strictly against production criteria and classify findings as [P0 blocker], [P1 defect], or [P2 craft]:
1. Resource leaks: unclosed streams/controllers, captured contexts across async gaps, listeners never removed.
2. Unnecessary rebuilds, layout thrashing, main-thread jank, N+1 queries.
3. Violations of separation of concerns, type safety, or unhandled error states.
4. For each finding, force me to justify the non-obvious architectural choice or state the fix I will make.
End with the one test I am missing.`,
  },
  {
    id: 'wiki-compiler',
    title: 'Karpathy wiki compiler',
    description: 'Compile today’s raw captures into atomic, interlinked concept pages.',
    category: 'wiki',
    tags: ['obsidian', 'wiki', 'compile', 'evening'],
    template: `Read my vault instructions, then act as the knowledge compiler for {{track}}.

Ingest every new file created today in /00_inbox/ and /raw/ that relates to {{week}}.

1. Compile or update atomic pages in /wiki/concepts/, /wiki/patterns/, and /wiki/ui_teardowns/ following the concept template.
2. Add bidirectional [[wiki links]] to prior weeks' nodes. Zero orphan pages.
3. Where my raw notes contradict official documentation, add a [!warning] Mental Model Correction callout with the exact invariant.
4. Update index.md and append a timestamped entry to log.md.
5. Output five spaced-repetition flashcards targeting the exact hesitations and bugs in today's /raw/bug_logs/.

Current week context: {{anchor}}
Knowledge points: {{kps}}`,
  },
  {
    id: 'wiki-lint',
    title: 'Weekly wiki lint & contradiction audit',
    description: 'Sunday sweep for orphan nodes, broken links, and recurring mistake patterns.',
    category: 'wiki',
    tags: ['sunday', 'obsidian', 'audit', 'remediation'],
    template: `Act as a knowledge-graph linter for my vault. Scan /wiki/, index.md, and the past seven days of /raw/bug_logs/.

1. List orphan nodes, broken [[links]], and duplicate concepts that should be merged.
2. Identify recurring mistake patterns (for example repeated async races, constraint errors, or null-assertion crashes). Quote the evidence from the logs.
3. Map those patterns back to the knowledge nodes for {{week}}: {{kps}}
4. Generate a 45-minute closed-book remediation drill that interleaves my two weakest primitives from this week with one primitive from two weeks ago.
5. Do not praise the notes. Only list defects and the drill.`,
  },
  {
    id: 'feynman-grader',
    title: 'Feynman Sunday grader',
    description: 'Explain the week to a junior engineer, then get graded on precision and gaps.',
    category: 'meta',
    tags: ['sunday', 'feynman', 'review', 'blind'],
    template: `Act as a demanding examiner. I will explain {{week}} from first principles as if teaching a junior engineer. Grade only what I actually say; do not fill in gaps for me.

My explanation:
[insert transcript]

1. Score 1–5 on: conceptual precision, causal chain (inputs → transformations → outputs), failure modes named, and absence of hand-waving.
2. Quote the exact sentence where my explanation became vague or circular, and ask one follow-up question about it.
3. List the three terms I used without defining them.
4. Give me a single 20-minute drill to close the largest gap before the next week unlocks.
Reference: {{anchor}}`,
  },
  {
    id: 'anki-generator',
    title: 'Anki card generator (JSON)',
    description: 'Turn this week’s concepts and mistake log into importable cards.',
    category: 'meta',
    tags: ['anki', 'flashcards', 'json', 'mistakes'],
    template: `Generate spaced-repetition flashcards from my current week in the {{track}} track.

Week: {{week}}
Anchor: {{anchor}}
Knowledge points: {{kps}}
My recent mistakes: {{mistakes}}

Rules:
- One atomic fact per card. Front is a question or a "why/what happens if" prompt; back is the shortest correct answer.
- No yes/no cards, no cards answerable by pattern-matching the wording.
- 60% concept, 40% failure-mode/edge-case.
- Use my own phrasing from the mistake log where possible.

Return ONLY valid JSON, no markdown fence:
{"cards":[{"front":"…","back":"…","tags":["week-{{weekNumber}}"],"source":"core"}]}
Produce 8 cards.`,
  },
]
