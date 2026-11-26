import type { WeekContent } from '../types'

/**
 * Week 6, written by hand from the blueprint: one token source, twelve
 * components, two themes, and a semantics tree that reads correctly.
 */
function prose(...paragraphs: string[]): string {
  return paragraphs.join('\n\n')
}

const week: WeekContent = {
  weekId: 'fl-w6',
  weekNumber: 6,
  dayPlans: [
    {
      day: 1,
      title: "One token source for the kit",
      summary: prose(
        "Today a colour token travels through the tree without being passed to every constructor. By the end, one extension holds the kit's tokens and dark mode swaps them once.",
        "An InheritedWidget lets a value travel down the tree, and any widget that reads it rebuilds when it changes. A ThemeExtension is a typed InheritedWidget built for design tokens. You add it to the theme, then read it with one call in any widget.",
        "The gain is rebuild scope. A widget that reads the token rebuilds, and a widget that does not stays still. Hard-coded colours have the opposite behaviour: every widget must be edited by hand when a theme changes.",
        "The failure this prevents is a dark mode that becomes a find-and-replace across forty files. One missed file keeps a white card on a dark canvas.",
        "Stop when a token change reaches one component without touching the component's code.",
      ),
      resources: [
        { label: "ThemeExtension", url: "https://api.flutter.dev/flutter/material/ThemeExtension-class.html", kind: "docs" },
        { label: "Material design", url: "https://docs.flutter.dev/ui/design/material", kind: "docs" },
      ],
      tasks: [
        "Create a theme extension with three colour roles.",
        "Add it to the light theme and to the dark theme.",
        "Read one role in a widget and change its value.",
        "Check: the widget updates and no other widget rebuilds.",
      ],
      direction:
        "Do not pass the token through five constructors. Put it in the theme once and read it where it is used.",
      designNote:
        "A token file is the kit's contract. Before: a colour literal in each widget, so a theme change is a search across the project. After: one role name that every widget reads. The kit now changes in one place, and the screens follow.",
      transferNote:
        "This is one token source for every widget; CSS custom properties solve the same problem.",
      estMinutes: 60,
      origin: "authored",
    },
    {
      day: 2,
      title: "Ask the pane, not the device",
      summary: prose(
        "Today you choose the right question: how much space do I have, or what device is this? By the end, a pane and a phone get different answers.",
        "LayoutBuilder reports the constraints at the point where it sits, so it answers the space question. MediaQuery reports the whole window, including system insets and text scale. A pane inside a desktop window can be phone-sized, and only the builder knows.",
        "A breakpoint is a width you name once. Put it in the token file beside the spacing scale, so every screen uses the same number. Then a rule such as a width under 600 means the same thing everywhere.",
        "The failure this prevents is a tablet layout inside a phone-sized pane. The window is wide, the pane is narrow, and the layout picks the wrong branch.",
        "Stop when one screen chooses its arrangement from the pane and not from the window.",
      ),
      resources: [
        { label: "LayoutBuilder", url: "https://api.flutter.dev/flutter/widgets/LayoutBuilder-class.html", kind: "docs" },
        { label: "MediaQuery", url: "https://api.flutter.dev/flutter/widgets/MediaQuery-class.html", kind: "docs" },
      ],
      tasks: [
        "Wrap the shell in a LayoutBuilder and print the max width.",
        "Add one breakpoint constant beside the spacing tokens.",
        "Resize the window and watch the arrangement change.",
        "Check: the branch follows the pane and not the window.",
      ],
      direction:
        "Do not read the window width inside a pane. Ask the pane for its constraint, then decide.",
      designNote:
        "A breakpoint is a shared constant, not a number in a file. Before: 600 in one screen and 640 in another, so the two layouts disagree at the seam. After: one named step both screens read. The seam disappears.",
      transferNote:
        "This is the space you actually have; every responsive system asks the pane, not the device.",
      estMinutes: 60,
      origin: "authored",
    },
    {
      day: 3,
      title: "Write the twelve-part list",
      summary: prose(
        "Today you write the list before you build it. By the end, twelve components and their states are named on one page.",
        "A design system is a contract: a fixed set of parts, each with the states it must survive. Write the list: button, input, card, list row, badge, sheet, dialog, tab, switch, avatar, empty state and skeleton. Beside each one, write default, pressed, disabled and loading where they apply.",
        "Every part reads from the same token source. No component holds a colour or a gap of its own. That single rule is what makes twelve parts feel like one kit.",
        "The failure this prevents is a kit that drifts. One button uses 12 points of padding, another uses 14, and the screen looks assembled rather than designed.",
        "Stop when every component has a state list and one token source.",
      ),
      resources: [
        { label: "Material design", url: "https://docs.flutter.dev/ui/design/material", kind: "docs" },
        { label: "Layout", url: "https://docs.flutter.dev/ui/layout", kind: "docs" },
      ],
      tasks: [
        "List twelve components on paper.",
        "Write the states each one must survive.",
        "Mark the one token source every part reads.",
        "Check: twelve parts, each with a state list and one source.",
      ],
      direction:
        "Do not build a component that exists on one screen. Add it to the list first, so the kit stays countable.",
      designNote:
        "A kit is judged by its worst state. Before: a button with a default and a disabled style, and a pressed state added later. After: four states designed together, with one spacing rule. The pressed state no longer shifts the label.",
      transferNote:
        "This is a contract for reusable parts; every design system ships the same inventory.",
      estMinutes: 60,
      origin: "authored",
    },
    {
      day: 4,
      title: "Build the kit and its gallery",
      summary: prose(
        "Today the list becomes a kit. By the end, the twelve parts render in both themes from one token set.",
        "Build the smallest part first: the button, then the input, then the row. Each one takes its colour, radius and spacing from the theme extension. Add a gallery screen that shows every part in every state, so a missing state is visible.",
        "The gallery is the proof. It renders both themes side by side, and it shows the disabled and loading states that a real screen rarely visits. A component that looks wrong in the gallery is wrong everywhere.",
        "The failure this prevents is a kit that only exists on one screen. Twelve parts that share a gallery can be reviewed, compared and fixed once.",
        "Stop when the gallery shows all twelve parts in both themes with no hard-coded value.",
      ),
      resources: [
        { label: "ThemeExtension", url: "https://api.flutter.dev/flutter/material/ThemeExtension-class.html", kind: "docs" },
        { label: "Material design", url: "https://docs.flutter.dev/ui/design/material", kind: "docs" },
      ],
      tasks: [
        "Build the button, the input and the list row first.",
        "Add a gallery that shows every state of each part.",
        "Render the gallery in the light theme and the dark theme.",
        "Check: twelve parts render in both themes with no literal colour.",
      ],
      direction:
        "Do not build the kit on a real screen. Build the gallery first, so every state is visible in one place.",
      designNote:
        "A gallery is a review surface. Before: components reviewed inside three different screens, at three different widths. After: one screen with every part at the same width. A gap in the kit is now obvious in a glance.",
      transferNote:
        "This is building from tokens instead of screens; every platform ships a component kit.",
      estMinutes: 90,
      origin: "authored",
    },
    {
      day: 5,
      title: "Let the text grow",
      summary: prose(
        "Today you raise the text scale and watch the layout fail. By the end, every fixed-height row has a reason to keep its height.",
        "A reader can set text to 200 percent. A row with a fixed height clips the second line, and the user loses the end of the sentence. A row with a minimum height grows, and the layout keeps its shape.",
        "Use minimum heights for rows and let the text decide. Reserve fixed heights for icons and rails, where the content does not scale. Check the screen at 1.0, 1.5 and 2.0 before you call it done.",
        "The failure this prevents is a screen that only works at the default setting. The reader who needs the larger text is the reader who loses the most.",
        "Stop when the gallery survives 2.0 text with every label readable.",
      ),
      resources: [
        { label: "Accessibility", url: "https://docs.flutter.dev/accessibility-and-localization/accessibility", kind: "docs" },
        { label: "Layout", url: "https://docs.flutter.dev/ui/layout", kind: "docs" },
      ],
      tasks: [
        "Set the text scale to 2.0 in the platform settings.",
        "Open the gallery and find the first clipped label.",
        "Replace one fixed height with a minimum height.",
        "Check: every label reads at 2.0 and no row clips.",
      ],
      direction:
        "Do not shrink the text to fit the box. Let the box grow, and keep fixed heights for things that do not scale.",
      designNote:
        "A row is a minimum, not a measure. Before: a 56-point row that clips at 2.0 text. After: a 56-point minimum that grows to 72. The list keeps its rhythm, and the sentence survives.",
      transferNote:
        "This is layout that grows with the reader; every accessible UI has to survive it.",
      estMinutes: 45,
      origin: "authored",
    },
    {
      day: 6,
      title: "Listen to the screen",
      summary: prose(
        "Today you listen to the screen the way a screen reader does. By the end, every control has a name and the reading order matches the visual order.",
        "The Semantics tree is what assistive technology announces. An icon button with no label is announced as a button and nothing else. A list row with three labels may be read as three separate items unless it is merged.",
        "Write the announcement beside each component in the gallery. Then test it: the same order, the same names, no duplicate. A label that only makes sense visually, such as an arrow, is excluded from the tree.",
        "The failure this prevents is a screen that is unusable with a screen reader even though it looks complete. Accessibility is a design decision made at the component, not a cleanup after launch.",
        "Stop when every control has a name and the reading order matches the screen.",
      ),
      resources: [
        { label: "Accessibility", url: "https://docs.flutter.dev/accessibility-and-localization/accessibility", kind: "docs" },
        { label: "Testing", url: "https://docs.flutter.dev/testing/overview", kind: "docs" },
      ],
      tasks: [
        "Turn on the screen reader and walk the gallery.",
        "Write the announcement for every control beside it.",
        "Merge one row that reads as three separate items.",
        "Check: every control has a name and the order matches the screen.",
      ],
      direction:
        "Do not label an icon with its shape. Label it with the action it performs, or exclude it from the tree.",
      designNote:
        "The announcement is part of the design. Before: an icon button announced as button, button, button. After: Save order, then Delete order. A reader who cannot see the icons can still finish the task.",
      transferNote:
        "This is the screen as a screen reader hears it; every platform exposes the same tree.",
      estMinutes: 75,
      origin: "authored",
    },
    {
      day: 7,
      title: "Audit the kit against itself",
      summary: prose(
        "Today you audit the kit against its own contract. By the end, twelve components, two themes and one accessibility tree pass together.",
        "Walk the list from Day 3. For each part, check the states, the token source, the 48-point target and the announcement. Mark each one pass or fail on paper, so the gaps are countable.",
        "Then open the app at 320 points, at 1280 and at 2.0 text. A kit that passes the gallery and fails a real screen is not finished. The screen is the last reviewer.",
        "The failure this prevents is a system that exists only in the gallery. A capstone audit tests the parts where they are used.",
        "Stop when every row has a pass, or a named fix, and the README shows the kit.",
      ),
      resources: [
        { label: "Accessibility", url: "https://docs.flutter.dev/accessibility-and-localization/accessibility", kind: "docs" },
        { label: "Widget tests", url: "https://docs.flutter.dev/testing/widget-tests", kind: "docs" },
      ],
      tasks: [
        "Walk the twelve-part list and mark each part pass or fail.",
        "Open the app at 320 points and at 1280 points.",
        "Set the text to 2.0 and repeat the walk.",
        "Check: every part has a pass or a named fix, and the README shows the kit.",
      ],
      direction:
        "Do not accept a gallery pass as finished. Open a real screen, because that is where the parts meet.",
      designNote:
        "A release note is part of the kit. Before: a repository with no screenshots and no component list. After: a README with the gallery, both themes and the state list. A reviewer can judge the kit without running it.",
      transferNote:
        "This is an audit against a contract; it works for a design system or a database schema.",
      estMinutes: 90,
      origin: "authored",
    },
  ],
}

export default week
