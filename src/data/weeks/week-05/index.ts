import type { WeekContent } from '../types'

/**
 * Week 5, written by hand from the blueprint: the widget, element and render
 * object trees, the box constraint protocol, and one layout for phone and TV.
 */
function prose(...paragraphs: string[]): string {
  return paragraphs.join('\n\n')
}

const week: WeekContent = {
  weekId: 'fl-w5',
  weekNumber: 5,
  dayPlans: [
    {
      day: 1,
      title: "Three trees, one screen",
      summary: prose(
        "Today you meet the three trees that build every Flutter screen. By the end, you can say which tree holds the configuration, which holds identity, and which holds the pixels.",
        "A widget is a cheap description. It says what the screen should look like, and it is thrown away on the next build. An element keeps identity and state, and it links a widget to a render object. A render object owns size, position and paint.",
        "That split explains a common surprise. Rebuilding a widget does not reset its state, because the element survives. Changing the key asks for a new element, so the state does reset. Use a key when identity must follow the data, not the position.",
        "The failure this prevents is a counter that keeps its number after a reset, or a list row that keeps the wrong state after a reorder. Both are identity bugs, not paint bugs.",
        "Stop when you can point to one widget, its element and its render object in the inspector.",
      ),
      resources: [
        { label: "Inside Flutter", url: "https://docs.flutter.dev/resources/inside-flutter", kind: "docs" },
        { label: "Layout", url: "https://docs.flutter.dev/ui/layout", kind: "docs" },
      ],
      tasks: [
        "Open the inspector and select one widget on the screen.",
        "Find its element and its render object in the same panel.",
        "Change the key and watch the state reset.",
        "Check: you can name all three nodes for one box.",
      ],
      direction:
        "Do not assume a rebuild resets state. Find the element first, then decide whether the key should change.",
      designNote:
        "Identity is a design decision. Before: a list row without a key, so a reorder moves the state to the wrong row. After: a key built from the item id, so the row keeps its own state. The user sees the same order, not a flash of someone else's edit.",
      transferNote:
        "This is separating configuration from identity and pixels; browsers do the same with the DOM and layout.",
      estMinutes: 60,
      origin: "authored",
    },
    {
      day: 2,
      title: "Read the constraints",
      summary: prose(
        "Today you learn the one rule that explains most layout surprises. By the end, you can trace a constraint from the parent down to a child and the size back up.",
        "Layout is a conversation. The parent passes a BoxConstraints with a minimum and a maximum for width and height. The child picks a size inside that range and returns it. The parent then places the child. Constraints flow down, sizes flow up.",
        "A tight constraint fixes a size, a loose one sets a maximum, and an unbounded one sets no limit. Order matters. A Column leaves its children unbounded in height, and a Row leaves them unbounded in width. That is why a list inside a column needs a bounded height.",
        "The failure this prevents is a mystery overflow. The yellow and black stripes are not a styling bug. They mean a child chose a size larger than its parent allowed.",
        "Stop when you can name the constraint on both axes for a row inside a column.",
      ),
      resources: [
        { label: "Constraints", url: "https://docs.flutter.dev/ui/layout/constraints", kind: "docs" },
        { label: "Layout", url: "https://docs.flutter.dev/ui/layout", kind: "docs" },
      ],
      tasks: [
        "Open the layout explorer and select a row inside a column.",
        "Write the minimum and maximum width and height beside it.",
        "Shrink the window until the row overflows.",
        "Check: you can name which axis ran out of room.",
      ],
      direction:
        "Do not change padding first. Read the constraint, find the axis, then change the parent that set it.",
      designNote:
        "A screen is a set of rules, not a fixed picture. Before: a card sized for one phone, with a hard width of 360. After: a card with a maximum width and a flexible margin. The second version reads well at 320 and at 1280.",
      transferNote:
        "This is constraints down and sizes up; CSS flexbox and iOS Auto Layout run the same conversation.",
      estMinutes: 60,
      origin: "authored",
    },
    {
      day: 3,
      title: "Sketch the three trees",
      summary: prose(
        "Today you draw the three trees for a split-view screen. By the end, the paper shows the widgets, the elements they create and the sizes that come back.",
        "Start with the widget tree: the screen, a row, a list and a detail pane. Under each widget, draw the element that keeps it alive. Then draw the render objects that own the boxes. Keep the three columns aligned, so one line of the page is one node in all three trees.",
        "Trace the constraints beside the boxes. Write the minimum and maximum width at the top, then the chosen size under each child. When a box overflows, the trace shows which parent allowed the wrong range.",
        "The failure this prevents is guessing at a layout bug. Without a trace, you change padding until the stripes disappear. With a trace, you find the parent that passed the wrong constraint.",
        "Stop when every box on the sketch has a constraint above it and a size inside it.",
      ),
      resources: [
        { label: "Layout", url: "https://docs.flutter.dev/ui/layout", kind: "docs" },
        { label: "Inside Flutter", url: "https://docs.flutter.dev/resources/inside-flutter", kind: "docs" },
      ],
      tasks: [
        "Draw the widget tree for the split view in one column.",
        "Draw the element and render object for each node in the next columns.",
        "Write a constraint above each box and a size inside it.",
        "Check: every box has both a constraint and a size.",
      ],
      direction:
        "Do not draw a pretty screen. Draw three aligned trees, so one horizontal line is one node at three levels.",
      designNote:
        "A wide screen is two panes with one rule between them. Before: a list that fills the screen and a detail screen pushed on top. After: a 320-point rail and a flexible detail pane, with the same widgets in both. The narrow layout is the same rule with one pane hidden.",
      transferNote:
        "This is tracing a system before changing it; debugging any renderer starts with the same map.",
      estMinutes: 60,
      origin: "authored",
    },
    {
      day: 4,
      title: "Build the adaptive split view",
      summary: prose(
        "Today the split view becomes one layout with two arrangements. By the end, a phone shows one pane and a wide screen shows both.",
        "A LayoutBuilder gives you the incoming width during layout. Decide from that number, not from the device name. Below a breakpoint, show the list and push the detail. Above it, show both side by side. The pane is the same widget in both cases.",
        "Use Expanded for the flexible pane and a fixed width for the rail. Keep the breakpoint in one constant, so a later screen can share it. The rule is a width, not a phone or a tablet.",
        "The failure this prevents is two screens that drift apart. A phone branch and a tablet branch written twice will disagree within a month. One rule with two arrangements stays honest.",
        "Stop when the same build shows one pane at 360 points and two panes at 900, with no layout error.",
      ),
      resources: [
        { label: "LayoutBuilder", url: "https://api.flutter.dev/flutter/widgets/LayoutBuilder-class.html", kind: "docs" },
        { label: "Expanded", url: "https://api.flutter.dev/flutter/widgets/Expanded-class.html", kind: "docs" },
      ],
      tasks: [
        "Wrap the screen in a LayoutBuilder and read the max width.",
        "Show one pane below the breakpoint and two above it.",
        "Give the rail a width and let the detail pane expand.",
        "Check: one pane at 360 and two panes at 900, with no overflow.",
      ],
      direction:
        "Do not branch on the device name. Branch on the width you were given, so a resized desktop behaves like a tablet.",
      designNote:
        "A master-detail screen keeps the selected row visible. Before: a detail screen with a back button and no context. After: the list stays on the left and the selected row is marked. The user knows where they are without going back.",
      transferNote:
        "This is one layout expressed as rules, not a fixed picture; every platform has breakpoints.",
      estMinutes: 90,
      origin: "authored",
    },
    {
      day: 5,
      title: "Break it with an unbounded box",
      summary: prose(
        "Today you break the layout on purpose and read the error as a constraint message. By the end, you know why a list cannot live in an unbounded box.",
        "A ListView wants to scroll, so it asks for infinite height and builds children as needed. A Column gives its children unbounded height. Two infinite requests meet, and the render object has no size to return. The error says the box has no size.",
        "The fix is to bound the box. Wrap the list in Expanded, give it a fixed height, or move it into a sliver. Each choice says which axis owns the scroll.",
        "The failure this prevents is a stack of guessed heights added until the error disappears. The error returns on the next screen. Read the constraint, then choose the bound.",
        "Stop when the list scrolls inside a bounded box, and you can explain which parent supplied the bound.",
      ),
      resources: [
        { label: "Layout", url: "https://docs.flutter.dev/ui/layout", kind: "docs" },
        { label: "Expanded", url: "https://api.flutter.dev/flutter/widgets/Expanded-class.html", kind: "docs" },
      ],
      tasks: [
        "Put a list inside a column with no height.",
        "Run it and copy the error message.",
        "Bound the list with Expanded and run it again.",
        "Check: the error is gone and the list scrolls.",
      ],
      direction:
        "Do not add a random height until the error stops. Name the axis that needs a bound, then bound that axis.",
      designNote:
        "A scroll area needs a frame. Before: a list stretched to infinity, with the empty state pushed off screen. After: a bounded list with the empty prompt centred inside it. The user sees the message without scrolling.",
      transferNote:
        "This is a missing size contract; every layout engine has an unbounded axis.",
      estMinutes: 45,
      origin: "authored",
    },
    {
      day: 6,
      title: "Test the width that breaks",
      summary: prose(
        "Today you prove the layout at the width that breaks it. By the end, a widget test renders 320 points and a key test survives a reorder.",
        "A widget test builds the screen in a fixed box. Set the surface to 320 by 640 and pump. If the layout overflows, the test fails with the same message the device shows. That is cheaper than finding it on a phone.",
        "Use a key on each list row, built from the item id. When the list reorders, the element follows the key, so the row keeps its own state. Without a key, the state follows the position and lands on the wrong item.",
        "The failure this prevents is a bug that only appears on a small phone or after a sort. Both are visible in a test, and both are invisible in a screenshot.",
        "Stop when the 320-point test passes and the reorder test keeps each row's state.",
      ),
      resources: [
        { label: "Testing", url: "https://docs.flutter.dev/testing/overview", kind: "docs" },
        { label: "Widget tests", url: "https://docs.flutter.dev/testing/widget-tests", kind: "docs" },
      ],
      tasks: [
        "Write a widget test with a 320 by 640 surface.",
        "Pump the split view and assert no overflow.",
        "Reorder the list and assert each row keeps its state.",
        "Check: both tests pass and the 320 test fails when you remove the bound.",
      ],
      direction:
        "Do not test only the default phone size. Set the smallest width on purpose, so the test can find the layout you forgot.",
      designNote:
        "The smallest screen is the honest reviewer. Before: a row of four badges that wraps at 320 and pushes the action off screen. After: two badges and an overflow count. The narrow layout keeps the action visible.",
      transferNote:
        "This is testing a layout at its smallest size; every UI framework can do it.",
      estMinutes: 75,
      origin: "authored",
    },
    {
      day: 7,
      title: "Trace it blind",
      summary: prose(
        "Today you rebuild the layout from a blank file and trace it out loud. By the end, one adaptive screen works at 320 and 900 with no notes.",
        "Start with the rule. Write the breakpoint, then the two arrangements, then the panes. Add the list and the detail as separate widgets. Keep the constraint trace beside the keyboard, so each box has a size before you run it.",
        "Say the three rules before you type: constraints flow down, sizes flow up, and every scroll needs a bound. If a sentence stalls, write it down and look it up after the rebuild.",
        "The failure this prevents is a layout that only works at one width. A rebuild at two widths proves the rule, not the picture.",
        "Stop at 60 minutes. Compare with Day 4 and name one constraint you got wrong the first time.",
      ),
      resources: [
        { label: "Layout", url: "https://docs.flutter.dev/ui/layout", kind: "docs" },
        { label: "Constraints", url: "https://docs.flutter.dev/ui/layout/constraints", kind: "docs" },
      ],
      tasks: [
        "Create a blank file and write the breakpoint rule first.",
        "Build the two arrangements with one pane and two panes.",
        "Run at 320 and at 900 and write down each gap.",
        "Check: both widths render without overflow and the gap list is on paper.",
      ],
      direction:
        "Do not open Day 4 while you rebuild. Finish first, compare second, so the check is honest.",
      designNote:
        "A layout is proved by its narrowest case. Before: a screen that looks right on a laptop and breaks on a phone. After: the same screen at 320 with the action still visible. The narrow case is the design, not an afterthought.",
      transferNote:
        "This is rebuilding a mental model from memory; it works for any system.",
      estMinutes: 90,
      origin: "authored",
    },
  ],
}

export default week
