import type { WeekContent } from '../types'

/**
 * Week 3, written by hand from the blueprint: records, patterns, sealed states
 * and the event loop. The checklist in `flutterWeeks1to6.ts` stays the evidence
 * layer; these cards only explain the day.
 */
function prose(...paragraphs: string[]): string {
  return paragraphs.join('\n\n')
}

const week: WeekContent = {
  weekId: 'fl-w3',
  weekNumber: 3,
  dayPlans: [
    {
      day: 1,
      title: "A record is a small bundle",
      summary: prose(
        "Today you bundle a few values into one record and read them back by name. By the end, one order value carries its id, its name and its amount together.",
        "A record groups fixed, typed values. Write `({int id, String name})` for a named record, or `(19, 'tea')` for a positional one. The named form reads well because each field has a label. `final order = (id: 19, name: 'tea');` then `order.id` returns 19.",
        "Records compare by value. Two records with the same fields are equal, so a test can compare them directly. That makes a record a good return type for a small result.",
        "The failure this prevents is a silent swap. A function returns `(int, String)`, and a later edit reorders the fields. `19, 'tea'` becomes `'tea', 19`, and the id prints as a name. Name the fields instead, so the compiler catches the swap.",
        "Stop when two records with the same values print true and the named fields read correctly.",
      ),
      resources: [
        { label: "Records", url: "https://dart.dev/language/records", kind: "docs" },
        { label: "Patterns", url: "https://dart.dev/language/patterns", kind: "docs" },
      ],
      tasks: [
        "Open `bin/order.dart` and write a named record with an id and a name.",
        "Print the id and the name by their field names.",
        "Compare two records with the same values and print the result.",
        "Check: both equal records print true and the named fields read correctly.",
      ],
      direction:
        "Do not return a positional record from a public function. Name the fields, so a reorder cannot swap two values.",
      designNote:
        "A record is a receipt row. Put the label and the value in two aligned columns, so the eye compares values without rereading labels. Before: `19 tea 450`. After: `id 19` on one line and `name tea` on the next. The second version survives a wide screen and a phone.",
      transferNote:
        "This is a fixed group compared by content; Python tuples and Rust structs carry the same idea.",
      estMinutes: 60,
      origin: "authored",
    },
    {
      day: 2,
      title: "Read a record with a pattern",
      summary: prose(
        "Today you pull a record apart in one step. By the end, one pattern reads an id and a name without a temporary variable.",
        "Pattern matching is a shape test with names. `if (order case (id: final int id, name: final String name))` reads both fields and binds them. The shape must match, and a guard adds a condition with `when`. A guard keeps the check beside the shape it protects.",
        "Destructuring is the same idea without a condition. `final (id: id, name: name) = order;` gives you two names in one line. Use it when the shape is known, and use a pattern when it might not match. Try both forms on the same value, so you can see which one needs a check.",
        "The failure this prevents is a cast that lies. `order as Map` compiles and then throws at runtime when the value is a record. A pattern returns false instead, so the bad value never reaches the next line.",
        "Stop when a matching order prints its two fields and a mismatched value prints one clear line.",
      ),
      resources: [
        { label: "Patterns", url: "https://dart.dev/language/patterns", kind: "docs" },
        { label: "Records", url: "https://dart.dev/language/records", kind: "docs" },
      ],
      tasks: [
        "Write a pattern that reads the id and name from one order.",
        "Add a `when` guard that rejects an empty name.",
        "Pass a map instead of a record and print the result.",
        "Check: the record prints both fields and the map prints one clear line.",
      ],
      direction:
        "Do not cast with as and hope. Test the shape first, then use the names the pattern bound.",
      designNote:
        "A pattern names the columns a screen already shows. If the order row shows id, name and amount, the pattern should read the same three fields in that order. Before: a cast and a comment. After: one pattern that lists the fields. The code and the row now describe the same thing.",
      transferNote:
        "This is testing a shape and naming its parts; JavaScript destructuring and Rust match do it too.",
      estMinutes: 60,
      origin: "authored",
    },
    {
      day: 3,
      title: "Draw the order state map",
      summary: prose(
        "Today you draw every state an order can hold. By the end, the paper shows the states, the moves and the states you refuse to allow.",
        "A state is a fact about the order, not a screen. An order is placed, paid, packed or shipped. Each arrow is one allowed move, and each state names what the user can do next. Draw the map before you write a class. Keep the map to one page, so a reader can hold it in their head.",
        "Booleans hide the real state. `isPaid`, `isShipped` and `isCancelled` allow eight combinations, and most of them are nonsense. A sealed class allows one value from a closed list, so the impossible combinations vanish.",
        "The failure this prevents is a screen that shows a spinner and an error at once. That screen exists because two flags were true together. Delete the impossible state from the model, and the screen has nothing to draw.",
        "Stop when every state has a name, every arrow has a guard, and one state is marked as the end. Keep the sketch beside the keyboard for the rest of the week.",
      ),
      resources: [
        { label: "Class modifiers", url: "https://dart.dev/language/class-modifiers", kind: "docs" },
        { label: "Patterns", url: "https://dart.dev/language/patterns", kind: "docs" },
      ],
      tasks: [
        "Open a blank page and list every state an order can hold.",
        "Draw one arrow for each allowed move between states.",
        "Mark one move you refuse to allow and write why.",
        "Check: every state has a name and every arrow has a guard.",
      ],
      direction:
        "Do not start from screens. Start from states, then decide which screen shows each one.",
      designNote:
        "Each state is a screen you must design once. Four states need four layouts, and no layout needs a spinner beside an error. Before: one screen with five flags. After: four screens with one job each. The second set is less work to build and less work to test.",
      transferNote:
        "This is a closed set of states with allowed moves; every language uses an enum or a union for it.",
      estMinutes: 60,
      origin: "authored",
    },
    {
      day: 4,
      title: "Build the sealed order machine",
      summary: prose(
        "Today the map becomes code. By the end, a sealed class holds the states and a switch returns one screen for each.",
        "A sealed class names a closed family. Write `sealed class OrderState {}`, then one final class for each state. `final class Paid extends OrderState { final int paise; }` holds the amount. The word sealed tells the compiler that every subtype lives in this library. No other file can add a fifth state.",
        "The switch expression returns a value. Write `switch (state)` with one branch per class, and return a label from each. The compiler fails when a state has no branch. That failure is the point.",
        "The failure this prevents is a forgotten branch. A default branch would compile today and hide the missing case tomorrow. Leave the default out, so the compiler lists the state you forgot. Read the error as a to-do list.",
        "Stop when every state has a branch, the code compiles, and no default branch exists.",
      ),
      resources: [
        { label: "Class modifiers", url: "https://dart.dev/language/class-modifiers", kind: "docs" },
        { label: "Patterns", url: "https://dart.dev/language/patterns", kind: "docs" },
      ],
      tasks: [
        "Create a sealed class with a placed state and a paid state.",
        "Write a switch expression that returns one label per state.",
        "Run it and print the label for both states.",
        "Check: both labels print and the switch has no default branch.",
      ],
      direction:
        "Do not add a default branch to silence the compiler. Add the missing state instead.",
      designNote:
        "A sealed state is a promise to the screen. If the model says paid, the screen shows the receipt, not a spinner. Before: a `paid` flag and a guessing layout. After: one state with one layout. The reader never sees two answers at once.",
      transferNote:
        "This is a closed union the compiler checks; TypeScript and Rust call it a tagged union.",
      estMinutes: 90,
      origin: "authored",
    },
    {
      day: 5,
      title: "Delete the impossible states",
      summary: prose(
        "Today you add a state and let the compiler find every place that forgot it. By the end, the model cannot hold two answers at once.",
        "Add `final class Cancelled extends OrderState {}` and run the build. Each switch that misses the new state fails. Read the failure as a list of screens to update. A default branch hides that list, so remove it first. Keep the error output in your notes.",
        "Count the old combinations. Two booleans allow four states, and three allow eight. A sealed family allows exactly the states you write. Delete the ones that cannot happen, and every later function has fewer cases to handle. The model shrinks and the tests shrink with it.",
        "The failure this prevents is a screen that shows a receipt and an error together. With flags, that pair is legal. With a sealed state, it cannot be written. That is a bug removed before it ran.",
        "Stop when the new state breaks the build in at least two places, and every failure names a real screen. Then handle each one.",
      ),
      resources: [
        { label: "Class modifiers", url: "https://dart.dev/language/class-modifiers", kind: "docs" },
        { label: "Patterns", url: "https://dart.dev/language/patterns", kind: "docs" },
      ],
      tasks: [
        "Add a cancelled state to the sealed class.",
        "Run the build and read every failing switch.",
        "Remove the default branch, then handle each failure.",
        "Check: the build fails before the fix and passes after it.",
      ],
      direction:
        "Do not keep a default branch. It hides the new state and the screen it needs.",
      designNote:
        "Fewer states mean fewer screens to design, test and translate. Before: three flags and eight combinations, six of them nonsense. After: four states and four layouts. The saved work is real, and the user never sees a broken combination.",
      transferNote:
        "This is making bad states unrepresentable; a database check constraint does the same job.",
      estMinutes: 45,
      origin: "authored",
    },
    {
      day: 6,
      title: "Trace the event loop",
      summary: prose(
        "Today you predict the order of printed lines before you run them. By the end, you can explain why `await` resumes later than the line beneath it. Write the prediction on paper first.",
        "Dart runs one thread with a stack and two queues. Synchronous code finishes first. Microtasks drain next, in order, before the next event. Timers and input wait in the event queue. A microtask can starve the queue if it keeps scheduling another microtask.",
        "`await` pauses the function and returns control to the loop. When the future completes, the rest resumes as a microtask. So `print('a'); await f(); print('b');` prints `a` first and `b` after the loop has room.",
        "The failure this prevents is a fire-and-forget loop. `items.forEach((item) async => await save(item))` starts every save at once and awaits none of them. Use `for (final item in items) { await save(item); }` for one at a time, or `Future.wait` when order does not matter.",
        "Stop when your predicted order matches the printed order, and you can name which line was a microtask.",
      ),
      resources: [
        { label: "Concurrency", url: "https://dart.dev/language/concurrency", kind: "docs" },
        { label: "Asynchronous programming", url: "https://dart.dev/language/async", kind: "docs" },
        { label: "fake_async", url: "https://pub.dev/packages/fake_async", kind: "docs" },
      ],
      tasks: [
        "Open `bin/loop.dart` and write four print lines with one future.",
        "Write the order you expect on paper before you run it.",
        "Run the file and compare the two orders.",
        "Check: your paper order matches the output and you can name the microtask.",
      ],
      direction:
        "Do not trust the order you wrote. Predict the queue, run it, then explain the difference.",
      designNote:
        "A screen shows one state because the loop runs one state at a time. While a future waits, show loading. When it resumes, replace it. Before: three flags and a flicker. After: one state and one frame. The loop makes that switch safe.",
      transferNote:
        "This is one thread with two queues; JavaScript and Node run the same loop.",
      estMinutes: 90,
      origin: "authored",
    },
    {
      day: 7,
      title: "Rebuild the pipeline blind",
      summary: prose(
        "Today you rebuild the week from an empty file. By the end, a sealed order pipeline parses one record and prints one state, with no notes. Use the same terminal window.",
        "Start with the sealed class and its states. Add the pattern parser next, then the switch, then the print. Keep the three rules on paper: one state at a time, every branch handled, every await resumed in order. Say each rule out loud before you type.",
        "A blank file shows what you cannot recall. Write the first line even when it feels slow, and note each gap as you find it. Open your Day 4 file only after the run, so the check measures what you know. The list of gaps is the real result.",
        "The failure this prevents is false confidence from reading. A page supplies the missing words, and a blank file does not. The gaps you write down are the next week's practice. Keep that list beside the keyboard.",
        "Stop at 60 minutes. Compare with Day 4 and name one difference. Keep the notes for the checkpoint.",
      ),
      resources: [
        { label: "Patterns", url: "https://dart.dev/language/patterns", kind: "docs" },
        { label: "Concurrency", url: "https://dart.dev/language/concurrency", kind: "docs" },
      ],
      tasks: [
        "Create a new console project and open an empty order file.",
        "Write the sealed states, the pattern parser and the switch.",
        "Run it and write down every gap you hit.",
        "Check: one record prints one state and your gap list is on paper.",
      ],
      direction:
        "Do not open Day 4 while you rebuild. Finish first, compare second, so the check is honest.",
      designNote:
        "The pipeline answers one question: what state is this order in? Cut every print that does not answer it. Before: five lines of debug output. After: one state line and the id. The reader gets the answer before the noise.",
      transferNote:
        "This is rebuilding a system from memory; it works the same for any language or trade.",
      estMinutes: 90,
      origin: "authored",
    },
  ],
}

export default week
