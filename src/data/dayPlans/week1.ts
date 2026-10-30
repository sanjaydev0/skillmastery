import type { DayPlan } from '../../types/schema'

/**
 * Week 1, written by hand.
 *
 * Every card follows `docs/CONTENT-STYLE.md` and the five fields keep their
 * order: title, summary, tasks, direction, design note. The checklist in
 * `flutterWeeks1to6.ts` is the evidence layer; these cards only explain the day.
 *
 * The summary is stored as paragraphs joined by a blank line so the Today view
 * can show the first paragraph and tuck the rest behind a disclosure.
 */

function prose(...paragraphs: string[]): string {
  return paragraphs.join('\n\n')
}

export const weekOneDayPlans: DayPlan[] = [
  {
    day: 1,
    title: 'A variable is a labelled box',
    summary: prose(
      'Today you run your first Dart file. By the end, you can print a profile card with your name, your age and your lucky number, and explain what each line does.',
      'A variable is a labelled box. The label is the name. The box holds one value, and the label has a type that says which values fit. Write `String name = \'Aarav\';` and the box called name holds text.',
      'Write `int age = 13;` and the box called age holds a whole number. Choose the type from the value: a name is String, a count is int, and a yes/no answer is bool.',
      'Dart reads the type before the name. If you write `int age = \'13\';`, Dart refuses to run the program. That refusal is the feature. The compiler checks the value at the door, so a wrong value cannot reach a line that expects a number. Fix it by choosing the type that matches the value: 13 has no quotes, so it is an int.',
      'Text and numbers join with interpolation. `print(\'$name is $age\');` prints `Aarav is 13`. The dollar sign reads the box and puts its value inside the string. For arithmetic, use a number: `print(age + 1);` prints 14. `print(\'$name is $age\' + 1)` fails, because you asked text to do maths.',
      'Read the error from the first line, not the last. Dart names the file, the line and the type it expected. `A value of type \'String\' can\'t be assigned to a variable of type \'int\'` is a complete answer. Take the fix from that sentence, not from a guess.',
      'Stop after the profile card prints. The rest of Week 1 builds on this one file. If the output is wrong, check three lines: the type, the value and the quotes. One of them does not match the other two.',
    ),
    resources: [
      { label: 'Dart language tour', url: 'https://dart.dev/language', kind: 'docs' },
      { label: 'Variables', url: 'https://dart.dev/language/variables', kind: 'docs' },
    ],
    tasks: [
      'Open a terminal in your course folder and run `dart create -t console profile`.',
      'Edit `bin/profile.dart` and print your name, age and lucky number on three lines.',
      'Change one value to the wrong type, run it, and read the error out loud.',
      'Check: the program prints three correct lines, and you can explain the error you saw.',
    ],
    direction:
      'Do not print one long sentence with commas. One fact per line, one label per fact, so a wrong value is visible at a glance.',
    designNote:
      'A profile card is a tiny table, even when it is plain text. Put every label at the same left edge and every value at the same second edge. Before: `name Aarav, 13, 7`. After: three lines with labels in one column. The second version lets a reader scan values without reading the labels again.',
    estMinutes: 80,
    origin: 'authored',
  },
  {
    day: 2,
    title: 'Store money as whole paise',
    summary: prose(
      'Today you build a pocket-money calculator that never loses a paisa. After this day, every amount in your ledger is a whole number of paise.',
      'Money in a computer is not a decimal. A `double` value such as `19.99` is stored as an approximation, and `0.1 + 0.2` can print `0.30000000000000004`. The fix is to store the smallest unit: 1999 paise, never 19.99 rupees. Convert once at the edge, when you read input or print a receipt.',
      '`final` and `const` both stop a box from being re-pointed. `final int price = 1999;` is fixed once the program runs. `const int paisePerRupee = 100;` is fixed before the program runs, because 100 is known at compile time. A `const` value cannot come from a file or a keyboard. Neither keyword freezes the object inside the box: a `final` list still accepts `list.add(500)`.',
      'The failure this prevents is a balance that drifts by one paisa. Add 19.99 and 0.01 as doubles and compare the result to 20.00. The test fails on some machines and passes on others. Add 1999 and 1 as ints and the answer is 2000 every time.',
      'Convert in one direction, in one place. `toPaise` turns rupees into paise, and `rupees` turns paise into a string. Never write 19.99 in two places. If the rounding rule changes, one function changes and the receipt follows.',
      'Stop when the calculator prints 1999 paise for an input of 19.99. Keep the rupees-to-paise conversion in one function, so the rule lives in one place.',
    ),
    resources: [
      { label: 'Built-in types', url: 'https://dart.dev/language/built-in-types', kind: 'docs' },
      { label: 'final and const', url: 'https://dart.dev/language/variables#final-and-const', kind: 'docs' },
    ],
    tasks: [
      'Open `bin/ledger.dart` and declare `const paisePerRupee = 100`.',
      'Write `toPaise(19.99)` so it returns 1999, using multiplication and `round()`.',
      'Print 1999 as `19.99` rupees with a `rupees()` function.',
      'Check: `dart run bin/ledger.dart` prints `1999 paise = 19.99 rupees`.',
    ],
    direction:
      'Do not store rupees as a double and format later. Store paise as an int, then format once for display.',
    designNote:
      'A receipt shows one amount in two forms: whole paise in the code and rupees with two decimals on the screen. Format at the edge. Before: `19.990000000000002`. After: `₹19.99`. The reader sees money, not a floating-point error, and the ledger still holds an exact int.',
    estMinutes: 85,
    origin: 'authored',
  },
  {
    day: 3,
    title: 'Parse text without a bang',
    summary: prose(
      'Today you turn messy text into a safe value. After this day, an empty field or a letter cannot crash your ledger.',
      'A nullable type says a value may be missing. `int?` means an int or nothing. `int.tryParse(\'42\')` returns 42, and `int.tryParse(\'abc\')` returns null. `null` is Dart’s name for “there is no value here”. The question mark belongs to the type, so the compiler can see the missing case.',
      'Handle both branches before you use the number. Read `final paise = int.tryParse(text);`, then return early when `paise == null`. After that check, `paise` is a plain `int`, and arithmetic works. This pattern is called a guard clause: bad input stops at the door. Name the failure in the message, so the next reader knows which rule stopped the value.',
      'The failure this prevents is the `!` operator. `int.parse(text)!` tells Dart to trust you. If text is empty, the program throws and the user sees a crash instead of a message. Use `tryParse` and a null check. Keep `!` out of Week 1 entirely.',      'Parse the whole string, not a prefix. `int.tryParse(\'19abc\')` returns null, which is right. A hand-written loop that stops at the first letter returns 19 and hides the rest. Let the parser reject the whole value, then ask the learner for a clean one.',
      'Prices with a decimal point need two steps. `int.tryParse(\'19.99\')` returns null, because the dot is not a digit. Split on the dot, or parse as `double` and convert to paise with `round()`. Stop after both bad inputs print a friendly message.',
    ),
    resources: [
      { label: 'Null safety', url: 'https://dart.dev/null-safety', kind: 'docs' },
      { label: 'int.tryParse', url: 'https://api.dart.dev/stable/dart-core/int/tryParse.html', kind: 'docs' },
    ],
    tasks: [
      'Write `parsePaise(String text)` that returns `int?` and calls `trim()` first.',
      'Print a friendly line for `\'\'` and for `\'abc\'`, and 1999 for `\'19.99\'`.',
      'Check: `dart run bin/ledger.dart` never throws, and `!` is absent from the file.',
    ],
    direction:
      'Do not add `!` to silence the compiler. Read the nullable value, handle the null branch, then use the number.',
    designNote:
      'An error message is part of the interface. Put it where the input is, one line under the field, and say what to do. Before: `Invalid input.` After: `Enter a price like 19.99.` The second line names the shape of a correct answer. The reader can fix the problem without guessing.',
    estMinutes: 85,
    origin: 'authored',
  },
  {
    day: 4,
    title: 'Build the ledger in one file',
    summary: prose(
      'Today the pieces become one program. After this day, you can add money, spend money and read the balance from a single run.',
      'A ledger is a list of entries and a rule. Each entry is an amount in paise, positive for money in and negative for money out. The balance is the sum. `entries.fold<int>(0, (sum, entry) => sum + entry)` reads every entry once and returns one number. An empty list sums to 0, which is the right balance for a new ledger.',
      'Guard every entry before it joins the list. Return early when `amount <= 0`, with a message that names the rule. A negative amount must not become income by accident. The guard keeps one bad value out of every total, and every later screen inherits the same truth.',
      'The failure this prevents is the sign flip. Spend 500 with a negative sign and the balance rises by 500. The receipt still looks plausible, so the bug survives a quick look. Fix it at the door: reject a negative amount, and let spending be a separate function that subtracts.',
      'Name the functions after the money, not the screen. `addMoney` and `spend` hold the rules. `showReceipt` prints. A test can call `addMoney(5000)` without a keyboard, a screen or the rest of the program. That split is what makes tomorrow’s tests cheap to write.',
      'Stop when one run shows three entries and the correct balance. Keep the arithmetic in functions that take values and return values, so a test can call them without a keyboard.',
    ),
    resources: [
      { label: 'Functions', url: 'https://dart.dev/language/functions', kind: 'docs' },
      { label: 'Collections', url: 'https://dart.dev/language/collections', kind: 'docs' },
    ],
    tasks: [
      'Add `addMoney(int paise)` and `spend(int paise)`, and guard both.',
      'Print the balance after each entry, then a final balance line.',
      'Check: adding 5000 and spending 1250 prints 3750 paise.',
    ],
    direction:
      'Do not store the balance as a value you update by hand. Sum the entries, so one missed update cannot desynchronise the total.',
    designNote:
      'The balance is the one loud number on the screen. Make it 32px and semibold, and make the labels 13px and muted. Before: every line at 24px, so the eye has no anchor. After: one number at 32px, entries at 13px. The reader answers “how much is left?” in one glance.',
    estMinutes: 85,
    origin: 'authored',
  },
  {
    day: 5,
    title: 'Break it with eight bad inputs',
    summary: prose(
      'Today you try to break your own program. After this day, you know which inputs fail, and you have a test for each one you fixed.',
      'A test is a claim with a check. `expect(parsePaise(\'abc\'), isNull);` says the parser returns null for letters. `package:test` runs every claim and reports pass or fail. Run `dart test` and read the summary line: all tests passed, or the name of the first failure. A failing test prints the expected value and the actual value, so the gap is visible.',
      'Use a table of inputs and expected results. Cover negative, `\'abc\'`, `\'12.345\'`, `\'1e9\'`, empty, spaces, `\'0.001\'` and `\'₹19.99\'`. The value `12.345` is the interesting one, because three decimals are not a valid paisa amount. Decide the rule before you write the expectation, then make the code match the rule.',
      'The failure this prevents is testing only the happy path. A parser that handles 19.99 and nothing else looks finished, then throws on a pasted rupee symbol. Fix one bug today, and add the test that would have caught it. One bug and one test is the day’s work.',
      'Run one test by name while you work. `dart test -n \'rejects letters\'` skips the rest and prints one result. A short loop between edit and result keeps the failure close to the change that caused it. Write the test before the fix when you can.',
      'Stop after the eighth input has an expectation and the suite passes. Keep the table in the test file, so later changes cannot quietly remove a case.',
    ),
    resources: [
      { label: 'package:test', url: 'https://pub.dev/packages/test', kind: 'docs' },
      { label: 'Testing Dart code', url: 'https://dart.dev/guides/testing', kind: 'docs' },
    ],
    tasks: [
      'Create `test/ledger_test.dart` with one `test()` per bad input.',
      'Run `dart test` and fix one failing case with a guard clause.',
      'Check: the summary says all tests passed, and eight names appear in the output.',
    ],
    direction:
      'Do not delete a failing test to get a green run. Read the expected and actual values, then decide which one is wrong.',
    designNote:
      'An error state is a screen, not a gap. Show the same layout with a short message in the space where the result would be. Before: a blank receipt and a console trace. After: the receipt frame with `Enter an amount above zero.` The reader sees a place to fix, not a broken app.',
    estMinutes: 65,
    origin: 'authored',
  },
  {
    day: 6,
    title: 'Make the receipt readable, then push',
    summary: prose(
      'Today the ledger becomes something another person can read. After this day, the receipt is aligned, the repository exists on GitHub, and your first commit is pushed.',
      'A commit is a save point with a message. `git add .` stages the files, and `git commit -m \'Add pocket-money ledger\'` writes the save point. A push copies those commits to GitHub, so the work leaves this laptop. The repository is the folder plus its history.',
      'Write the receipt with fixed columns. Pad each label to the same width, then print the amount right-aligned. `label.padRight(14)` and `amount.toString().padLeft(8)` put every decimal point in the same column. Print the header row once, then one row per entry, in the same column order.',
      'Test the layout with the longest label you expect, not the shortest. A proportional screen font still looks ragged, so plan the plain-text version first.',
      'The failure this prevents is committing the wrong files. `build/` holds generated output and grows on every run. Add a `.gitignore` with `build/` and `.dart_tool/` before the first commit. If a file is already staged, run `git rm --cached <file>` and commit again.',
      'Write the commit message in the imperative, as if it completes the sentence “This commit …”. `Add pocket-money ledger` reads well. A history of vague messages cannot explain a bug six weeks later. One commit, one idea, and a message that names the change.',
      'Stop after the push appears on GitHub. A README with three lines is enough: what the program does, how to run it, and one example output.',
    ),
    resources: [
      { label: 'About Git', url: 'https://docs.github.com/en/get-started/using-git/about-git', kind: 'docs' },
      { label: 'Hello World on GitHub', url: 'https://docs.github.com/en/get-started/start-your-journey/hello-world', kind: 'docs' },
    ],
    tasks: [
      'Add `.gitignore` with `build/` and `.dart_tool/`, then run `git init`.',
      'Commit with a message that names the feature, then push to a new GitHub repository.',
      'Check: the repository page shows your commit and no `build/` folder.',
    ],
    direction:
      'Do not commit a folder you cannot explain. Ignore generated files. Remove anything that holds a key before the first push.',
    designNote:
      'Alignment is a reading aid. A receipt with labels at one edge and amounts at another lets the eye compare numbers without reading words. Before: `Lunch - 450` and `Bus - 120` in a ragged list. After: two columns with the amounts right-aligned. The decimal points line up, so the largest spend is visible first.',
    estMinutes: 100,
    origin: 'authored',
  },
  {
    day: 7,
    title: 'Rebuild it from an empty file',
    summary: prose(
      'Today you prove the week stuck. After this day, you can rebuild the pocket-money ledger from an empty file, with no notes, in 60 minutes.',
      'Rebuilding is retrieval. Rereading notes feels smooth because the page supplies the missing words. A blank file supplies nothing, so every gap is visible. Start with `dart create -t console ledger`, then write the parse function, then the entries, then the receipt, in that order. Keep the terminal open beside the file, so one key runs the program.',
      'Say the three rules out loud before you start. A variable has a type, and the compiler checks it. Money is an int of paise, and formatting happens at the edge. A nullable value is checked before use, and `!` stays out. If a sentence stalls, write it down and look it up after the rebuild.',
      'The failure this prevents is false confidence. A learner who reads the week and nods can still freeze at an empty file. The rebuild turns that freeze into a short list of gaps you can fix on the next pass.',
      'Keep a blank file and a copy of the Week 1 folder side by side. The blank file is the test. The copy is the answer key, and you open it only when the clock stops. Read your own code as a stranger would, line by line.',
      'Stop at 60 minutes, even if the receipt is unfinished. Compare your file with your Day 4 code and name one difference. That difference is what to practise next.',
    ),
    resources: [
      { label: 'Dart language tour', url: 'https://dart.dev/language', kind: 'docs' },
      { label: 'Effective Dart: design', url: 'https://dart.dev/effective-dart/design', kind: 'article' },
    ],
    tasks: [
      'Open an empty folder and create a new console project with `dart create`.',
      'Write the parser, the entries and the receipt without opening your old file.',
      'Check: the program prints a correct receipt, and you wrote down every gap.',
    ],
    direction:
      'Do not open yesterday’s file while you rebuild. Finish first, compare second, so the check shows what you know.',
    designNote:
      'The week’s artefact answers one question: how much money do I have? A date, a greeting and a logo do not help. Before: six lines of decoration above the balance. After: balance first, last three entries under it. Cut until the answer is the first line the reader sees.',
    estMinutes: 90,
    origin: 'authored',
  },
]
