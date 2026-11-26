import type { WeekContent } from '../types'

/**
 * Week 4, written by hand from the blueprint: Gestalt grouping, the 8pt grid,
 * semantic colour roles and the five mandatory UI states. The checklist stays
 * the evidence layer; these cards explain the day.
 */
function prose(...paragraphs: string[]): string {
  return paragraphs.join('\n\n')
}

const week: WeekContent = {
  weekId: 'fl-w4',
  weekNumber: 4,
  dayPlans: [
    {
      day: 1,
      title: "The eye groups before it reads",
      summary: prose(
        "Today you learn what the eye does in the first 200 milliseconds. By the end, you can explain why one screen feels calm and another feels noisy.",
        "Gestalt is the study of how the eye groups shapes before it reads a word. Proximity is the strongest law: things close together belong together. Common region is the second: a shared background or border groups items even when they sit apart. Similarity groups by size, weight and colour.",
        "Spacing does the work that borders pretend to do. A label 4px from its value reads as one unit. The same pair 24px apart reads as two groups. Before you add a line, try space.",
        "The failure this prevents is a screen where every box has a border, every title is the same size, and nothing leads. The eye has no first stop, so the user reads everything and remembers nothing.",
        "Stop when you can point to three groups on one screen and name the law that binds each one.",
      ),
      resources: [
        { label: "Material design", url: "https://docs.flutter.dev/ui/design/material", kind: "docs" },
        { label: "Layout", url: "https://docs.flutter.dev/ui/layout", kind: "docs" },
      ],
      tasks: [
        "Open one production app and screenshot its main screen.",
        "Mark three groups and name the law that binds each group.",
        "Remove one border in the sketch and replace it with space.",
        "Check: three groups are marked and one border is gone.",
      ],
      direction:
        "Do not add a border to separate two groups. Try a larger gap first, then add a line only if the gap fails.",
      designNote:
        "Hierarchy comes from three channels used together: size, weight and contrast. Before: a title at 16px bold and a body at 16px regular. After: a title at 20px semibold, a body at 15px regular and a muted label at 12px. The eye now has an order to follow.",
      transferNote:
        "This is grouping by space rather than decoration; every visual medium uses the same laws.",
      estMinutes: 60,
      origin: "authored",
    },
    {
      day: 2,
      title: "Space on a base of eight",
      summary: prose(
        "Today you replace guessed spacing with a scale. By the end, every gap on your screen comes from the same short list.",
        "An 8pt grid is a set of steps: 4, 8, 12, 16, 24, 32, 48. Pick a step, then reuse it. Four points is for a tight gap between an icon and its label. Eight and sixteen separate groups. The grid removes the argument about whether 13 is better than 14.",
        "The same numbers set the type scale. A title, a body line and a label can share a ratio, so the jump between sizes feels deliberate. Touch targets stay at least 48 points, even when the icon inside is 20.",
        "The failure this prevents is drift. One screen uses 13.5, another 29, and baselines land on different pixels. The eye reads the wobble as sloppiness, even when it cannot name it.",
        "Stop when every margin, height and font size on the wireframe comes from your list, and one note explains each choice.",
      ),
      resources: [
        { label: "Layout", url: "https://docs.flutter.dev/ui/layout", kind: "docs" },
        { label: "Accessibility", url: "https://docs.flutter.dev/accessibility-and-localization/accessibility", kind: "docs" },
      ],
      tasks: [
        "Write the spacing steps 4, 8, 12, 16, 24, 32 and 48 on paper.",
        "Measure one real screen and mark each gap against a step.",
        "Set one 20px icon inside a 48px touch target.",
        "Check: every marked gap sits on a step and the target measures 48.",
      ],
      direction:
        "Do not tune a value by eye. Snap it to the nearest step, then judge the step, not the pixel.",
      designNote:
        "A type scale is a small set of sizes with one ratio. Before: 12, 13, 15, 17 and 19 on one screen. After: 12, 15, 20 and 32. Fewer sizes make the hierarchy louder and the code shorter, because every size becomes a token.",
      transferNote:
        "This is a constraint system for space; every design tool and platform ships the same scale.",
      estMinutes: 60,
      origin: "authored",
    },
    {
      day: 3,
      title: "Wireframe five states first",
      summary: prose(
        "Today you draw the order screen on paper before any code. By the end, five states sit on one page.",
        "A UI state is one honest answer to what the screen is doing: empty, loading, populated, offline or error. Draw all five. The empty state explains how to start. The loading state holds the layout. The error state says what failed and what to try.",
        "Use the 8pt grid for every box. Mark the padding, the gap and the touch target. A wireframe with numbers on it can be built; a sketch without them is a mood.",
        "The failure this prevents is inventing the error state during implementation. By then the layout is fixed and the message has nowhere to go. Draw the hard state first and the happy path becomes simpler.",
        "Stop when all five states share the same frame, and the error state names one action.",
      ),
      resources: [
        { label: "Layout", url: "https://docs.flutter.dev/ui/layout", kind: "docs" },
        { label: "Material design", url: "https://docs.flutter.dev/ui/design/material", kind: "docs" },
      ],
      tasks: [
        "Draw one frame and mark the grid inside it.",
        "Draw all five states in the same frame.",
        "Mark the padding, the gap and the touch target.",
        "Check: five states share one frame and the error state names one action.",
      ],
      direction:
        "Do not start with the populated screen. Start with empty and error, where the layout has the least to lean on.",
      designNote:
        "Five states are five layouts with one frame. Before: a happy path, then a red box pasted over it. After: one frame with a slot for the message, the skeleton and the empty prompt. The frame proves the screen can hold every answer.",
      transferNote:
        "This is designing edge states before the happy path; every platform has the same five.",
      estMinutes: 60,
      origin: "authored",
    },
    {
      day: 4,
      title: "Name colours by their job",
      summary: prose(
        "Today you turn a palette into roles. By the end, a token file names what each colour does, not what it looks like.",
        "A semantic token maps a role to a value: canvas, surface, text, muted text, border, accent, danger. The role survives a theme change. A raw hex value does not. Write the roles once in a Dart file with const values, and let every screen read the role.",
        "Light and dark are two sets of values behind the same names. Dark mode inverts luminance, not every colour. A raised surface in the dark theme gets lighter, because a shadow cannot show on a dark background.",
        "The failure this prevents is a dark theme that looks like a photo negative. Blue stays blue, but the surface under it changes. Roles keep that promise; hex values break it.",
        "Stop when a screen can switch themes by swapping one token set, and no widget holds a hex value.",
      ),
      resources: [
        { label: "ThemeData", url: "https://api.flutter.dev/flutter/material/ThemeData-class.html", kind: "docs" },
        { label: "Variables", url: "https://dart.dev/language/variables", kind: "docs" },
      ],
      tasks: [
        "Create `lib/tokens.dart` with const spacing, radius and colour roles.",
        "Group the colours as canvas, surface, text, muted, border, accent and danger.",
        "Write a light set and a dark set behind the same role names.",
        "Check: every role has two values and no widget holds a hex value.",
      ],
      direction:
        "Do not name a token after its colour. Name it after the job, so a theme change does not make the name wrong.",
      designNote:
        "A role name is a promise. `canvas` stays the page colour in both themes, while `blue600` stops being true the moment the theme changes. Before: `Color(0xFF2563EB)`. After: `surface.accent`. The second survives a redesign.",
      transferNote:
        "This is separating a value from its role; CSS variables and iOS asset catalogs do the same.",
      estMinutes: 90,
      origin: "authored",
    },
    {
      day: 5,
      title: "Break dark mode on purpose",
      summary: prose(
        "Today you make a dark screen fail, then fix it. By the end, you can explain why a black shadow disappears.",
        "A shadow needs a lighter background to cast onto. On a dark canvas, a black shadow is invisible. The fix is tonal: each higher surface gets a lighter fill. The eye reads the step as height.",
        "Try a pure black background and a pure white card. The contrast is harsh, and the card looks pasted on. Move both values toward the theme's slate, and the same layout feels calm.",
        "The failure this prevents is a dark theme built by inversion. Inversion turns every illustration, logo and warning colour inside out. A role-based theme changes only the surfaces and the text.",
        "Stop when two raised surfaces are distinguishable in the dark theme without a shadow, and a note explains the step.",
      ),
      resources: [
        { label: "ThemeData", url: "https://api.flutter.dev/flutter/material/ThemeData-class.html", kind: "docs" },
        { label: "Material design", url: "https://docs.flutter.dev/ui/design/material", kind: "docs" },
      ],
      tasks: [
        "Set a dark canvas and a black shadow on one card.",
        "Screenshot it and mark where the shadow should be.",
        "Replace the shadow with a lighter surface step.",
        "Check: the card reads as raised with no shadow visible.",
      ],
      direction:
        "Do not invert white to black. Keep the hue and step the luminance, or the theme will look like a negative.",
      designNote:
        "In the dark theme, height is a lighter fill. Before: three cards with the same fill and a shadow that cannot be seen. After: canvas, then surface, then a lighter surface. The eye reads three levels without a single line.",
      transferNote:
        "This is using lightness to show height; every dark theme does it without shadows.",
      estMinutes: 45,
      origin: "authored",
    },
    {
      day: 6,
      title: "Audit contrast and spacing",
      summary: prose(
        "Today you measure the screen instead of trusting it. By the end, every text pair has a number and every gap comes from the scale.",
        "Contrast ratio compares the luminance of text and its background. Body text needs 4.5:1. Large text and UI controls need 3:1. A ratio below the line is a bug, even when the design looks fine on your monitor.",
        "Write the audit as a table: element, foreground, background, ratio, pass or fail. Then list every spacing value and mark the ones outside the scale. Two lists turn taste into evidence.",
        "The failure this prevents is a screen that only works on one display. A muted grey that passes on a bright laptop fails on a phone in daylight. The ratio catches it before a user does.",
        "Stop when every row passes, or is changed until it does, and the spacing list has no stray number.",
      ),
      resources: [
        { label: "Accessibility", url: "https://docs.flutter.dev/accessibility-and-localization/accessibility", kind: "docs" },
        { label: "Layout", url: "https://docs.flutter.dev/ui/layout", kind: "docs" },
      ],
      tasks: [
        "List every text pair on the order screen.",
        "Write the ratio for each pair and mark pass or fail.",
        "List every spacing value and mark the stray ones.",
        "Check: every pair passes and no stray spacing value remains.",
      ],
      direction:
        "Do not trust the monitor. Measure the pair, then change the value until the ratio passes.",
      designNote:
        "Muted text is a contrast decision, not a mood. Before: a label at 2.8:1 that looks gentle on a laptop. After: the same label at 4.6:1 with a slightly darker tone. The screen still reads calm, and the label survives daylight.",
      transferNote:
        "This is measuring a visual claim; WCAG runs the same test on every platform.",
      estMinutes: 75,
      origin: "authored",
    },
    {
      day: 7,
      title: "Draw the screen from memory",
      summary: prose(
        "Today you redraw the week from a blank page. By the end, one annotated screen carries the grid, the roles and all five states.",
        "Start with the frame and the grid. Mark the three levels of type. Place the primary action, then the evidence beneath it. Draw the five states in the same frame, so the layout proves it can hold each one.",
        "Name every token you use. If a colour has no role, the screen is not finished. If a gap has no step, the grid is not finished.",
        "The failure this prevents is a screen that only exists as a picture. A wireframe with tokens and states can be built by someone else. A pretty sketch cannot.",
        "Stop at 60 minutes. Compare with Day 3 and name one thing the second drawing does better.",
      ),
      resources: [
        { label: "Layout", url: "https://docs.flutter.dev/ui/layout", kind: "docs" },
        { label: "Accessibility", url: "https://docs.flutter.dev/accessibility-and-localization/accessibility", kind: "docs" },
      ],
      tasks: [
        "Draw the frame and mark the 8pt grid.",
        "Mark three type levels and the primary action.",
        "Draw all five states and name every token.",
        "Check: five states share one frame and every colour has a role.",
      ],
      direction:
        "Do not open Day 3 while you redraw. Finish first, compare second, so the check is honest.",
      designNote:
        "One screen, one question: can this order be approved? Cut every element that does not answer it. Before: a header, a logo, three badges and a greeting. After: the order total, the stock warning and one action. The answer arrives first.",
      transferNote:
        "This is rebuilding a design system from memory; it works the same for any platform.",
      estMinutes: 90,
      origin: "authored",
    },
  ],
}

export default week
