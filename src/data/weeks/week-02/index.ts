import type { WeekContent } from '../types'

/**
 * Week 2, written by hand from the blueprint, the authored 15-task checklist
 * and the long-form course source. Only the editorial layer is here: the
 * checklist remains the evidence, and a checked task is the only credit.
 */
function prose(...paragraphs: string[]): string {
  return paragraphs.join('\n\n')
}

const week: WeekContent = {
  weekId: 'fl-w2',
  weekNumber: 2,
  // The canonical Week 2 checklist is already authored. Keep it.
  dayPlans: [
    {
      day: 1,
      title: "A function that remembers",
      summary: prose(
        "Today you write a function that remembers a number between calls. By the end, makeCounter() returns 1, then 2, then 3, and you can explain why that number survives.",
        "A function can be a value. You store it in a variable and call it later. When an inner function uses a variable from its outer function, Dart keeps that variable alive. The pair is called a closure.",
        "Think of the outer function as a box that holds the variable. The inner function carries that box with it. The box stays even after the outer function finishes.",
        "Write `int count = 0;` inside makeCounter. Return a function that adds 1 to count and returns it. Call the returned function three times and print the result. You see 1, then 2, then 3.",
        "Each call to makeCounter builds a new box, so two counters never share one number. Print each call on its own line so you can see the count grow.",
        "The failure is one shared count. Put count outside the factory and every counter changes the same number. A second counter then starts at 4 instead of 1.",
        "Fix it by declaring count inside the factory. Stop when your three printed lines read 1, 2 and 3. Try it with two counters to prove the point.",
        "Read the code aloud from the inside out. The inner function is the value you return. The outer function only builds it. That split is the whole idea today, and one file is enough. The name closure fits, because the inner function closes over the box.",
      ),
      resources: [
        { label: 'Functions', url: 'https://dart.dev/language/functions', kind: 'docs' },
        { label: 'Variables', url: 'https://dart.dev/language/variables', kind: 'docs' },
      ],
      tasks: [
        "Open bin/counter.dart and read the dart.dev functions page.",
        "Write makeCounter() with a local count and a returned function.",
        "Call it three times and print the three numbers.",
        "Check: the output reads 1, then 2, then 3.",
      ],
      direction: "Do not put the count outside the factory. Each returned function needs its own number, or two counters share one total.",
      designNote: "A report has one number that answers the whole question. For the snack shop, that is total sales. Put it at the top left in large type, with the best seller underneath. Before: four cards of equal size. After: one loud total with quiet evidence below.",
      estMinutes: 80,
      origin: 'authored',
    },
    {
      day: 2,
      title: "Ask questions with where, map and fold",
      summary: prose(
        "Today you answer three questions about a list without writing a for loop. By the end, one list of snack prices gives you a total, a filtered list and a best seller.",
        "where keeps items that pass a test. map changes each item into something else. fold walks the list and builds one answer. Chain them in that order and read the chain left to right. Each step does one job.",
        "An Iterable is a recipe for work, not the work itself. Dart runs the steps when you ask for a result. With prices 20, 15 and 25, fold starts at 0 and adds each price once. The answer is 60.",
        "A lazy chain saves work when you only need the first item. where asks each price once, then stops.",
        "The failure is extra lists. Calling toList after every step builds a copy at each arrow. With 100,000 sales that wastes memory.",
        "Fix it by chaining where, map and fold, then taking one result. Call toList only when you need rows to print.",
        "Stop when the three answers print on three lines. Say each method name out loud as you use it. The names are short because each step does one job. That is the day's work. Write the chain in one line, then split it if it gets hard to read.",
        "A short chain reads well on a phone. Keep each arrow as one clear thought.",
        "Check the three lines against your paper sketch. The total, the filtered list and the best seller should agree.",
      ),
      resources: [
        { label: 'Collections', url: 'https://dart.dev/language/collections', kind: 'docs' },
        { label: 'Functions', url: 'https://dart.dev/language/functions', kind: 'docs' },
      ],
      tasks: [
        "Open bin/report.dart and write a list of three snack prices.",
        "Use where to keep prices under 20, then map to show them as rupees.",
        "Use fold to print the total and the highest price.",
        "Check: the output shows 60 as the total and 25 as the best seller.",
      ],
      direction: "Do not add toList after each step. Chain the steps, then take one result at the end.",
      designNote: "The total is the loud number. Put it top left at 32px and semibold. Show the filtered snacks as a short list beneath it, each row at 13px. Before: three equal boxes competing for attention. After: one total and a supporting list that the eye reads second.",
      estMinutes: 85,
      origin: 'authored',
    },
    {
      day: 3,
      title: "Equal products must compare equal",
      summary: prose(
        "Today you make two Product objects with the same data count as equal. By the end, a test proves it and a Set holds one copy.",
        "Every object has an identity. By default, == asks whether two names point at the same object. Two products with the same name and price are still two objects. Value equality means they compare equal because their contents match. Think of identity as a name tag and contents as the words on the card.",
        "A name tag stays with one card. The words on two cards can match even when the cards are different. Value equality compares the words, not the tags.",
        "Define operator == to compare the fields. Then define hashCode so a hash table can find the object. If a == b is true, a.hashCode == b.hashCode must be true too. Use Object.hash(name, price) to build it. Write the two methods next to each other in the file.",
        "The failure is writing == alone. A Set then treats two equal products as different and keeps both. Fix it by writing both methods in the same edit. Add a test that puts two equal products in a Set and checks its length is 1. Run the test before and after the change.",
        "copyWith returns a changed copy without touching the original. Keep the original for comparison. The report only needs the copy. Stop when the test passes.",
        "Write the test before you add the two methods. Watch it fail first, then watch it pass.",
      ),
      resources: [
        { label: 'Classes', url: 'https://dart.dev/language/classes', kind: 'docs' },
        { label: 'Collections', url: 'https://dart.dev/language/collections', kind: 'docs' },
      ],
      tasks: [
        "Open lib/product.dart and add a final name and a final price.",
        "Add operator == and hashCode with Object.hash(name, price).",
        "Add copyWith that returns a new Product with changed fields.",
        "Check: dart test passes a Set with two equal products holding one item.",
      ],
      direction: "Do not compare with identical. Compare the fields, and write hashCode in the same edit.",
      designNote: "The report groups identical snacks into one row. If two equal products stay separate, the best seller splits into two weak rows. Before: tea 20 and tea 20 on two lines. After: one row with tea 20 and a count of 2. The reader sees one clear winner.",
      estMinutes: 90,
      origin: 'authored',
    },
    {
      day: 4,
      title: "Build the snack dashboard",
      summary: prose(
        "Today the pipeline becomes a report. By the end, one command prints total sales, the best seller and every snack under 20 rupees.",
        "Draw the work on paper before you type. Write list, then filter, then map, then total. Put one arrow between each pair. Each arrow is one small function. Keep the sketch beside your keyboard while you code.",
        "Composition means joining small functions so one output becomes the next input. where picks the cheap snacks. map turns each price into a line of text. fold adds the prices into one total. The names stay short because each job is small.",
        "The failure is reading the list three times. Each pass walks every price again. With five snacks the waste is invisible. With 100,000 it is not.",
        "Fix it by building one pipeline that returns all three answers. Take one result, then print it.",
        "One function can return three answers at once. Put them in a small object with named fields. The print step then reads those names instead of guessing which number is which. Keep the object local to this file. That keeps the report honest.",
        "Stop when the output shows Total 60, Best 25 and Under 20: 15. Read the lines in the same order every run. That order matches the design thread for this week.",
        "A good report answers before it explains. Put the best seller first, then the total, then the cheap list. Leave out anything that does not help the reader choose a snack.",
      ),
      resources: [
        { label: 'Collections', url: 'https://dart.dev/language/collections', kind: 'docs' },
        { label: 'Functions', url: 'https://dart.dev/language/functions', kind: 'docs' },
      ],
      tasks: [
        "Sketch list, filter, map and total on paper, one arrow per function.",
        "Write report with a list of prices and one small result object.",
        "Print each answer on its own labelled line.",
        "Check: the output shows Total 60, Best 25 and Under 20: 15.",
      ],
      direction: "Do not read the list three times. Build one pipeline, take one result, then print it.",
      designNote: "A report reads top left to bottom right. Put the best seller first and largest. Put the total and the cheap snacks beneath it in smaller type. Before: three boxes in a row with equal weight. After: one anchor and two quiet lines that the reader can scan.",
      estMinutes: 85,
      origin: 'authored',
    },
    {
      day: 5,
      title: "Break the Set on purpose",
      summary: prose(
        "Today you remove one line and watch the report break. By the end, you know why hashCode belongs beside ==. Keep the working file open so you can compare.",
        "A Set keeps one copy of each value. It uses hashCode to find a bucket, then == to check the exact item. A bucket is one group in a hash table. Two products with equal fields should land in the same bucket. The bucket idea is why the two methods must agree.",
        "A hash table is a row of buckets. Each bucket holds values that share a hash. Dart picks the bucket first, then compares the exact value inside it.",
        "Delete hashCode and Dart uses object identity. The two products land in different buckets and both survive. The report then shows tea twice and tea looks like two winners. Read the failing assertion out loud before you fix anything.",
        "Fix it by restoring Object.hash(name, price). Add a test that puts two equal products in a Set and checks the length is 1. Run dart test once before and once after the change. The assertion names the two products and the expected count. Both runs belong in the same test file.",
        "Stop when the test fails without hashCode and passes with it. Write both methods in one edit from now on. Keep the failing output in your notes. That note saves time when the same bug returns.",
        "Write the expected count in the test name. A failing name tells you which rule broke.",
      ),
      resources: [
        { label: 'Classes', url: 'https://dart.dev/language/classes', kind: 'docs' },
        { label: 'Collections', url: 'https://dart.dev/language/collections', kind: 'docs' },
      ],
      tasks: [
        "Comment out hashCode in lib/product.dart and save the file.",
        "Run dart test and read the failing Set assertion.",
        "Restore hashCode and confirm the test passes.",
        "Check: the test names two equal products and one Set item.",
      ],
      direction: "Do not delete the failing test. Read the assertion, then restore the missing method.",
      designNote: "A duplicate row makes a report look busy and wrong. Show one row for each product and a count beside it. Before: tea 20 twice, so tea looks like two winners. After: one tea 20 row with count 2. The reader trusts a list that never repeats itself.",
      estMinutes: 65,
      origin: 'authored',
    },
    {
      day: 6,
      title: "Measure the pipeline, then open a PR",
      summary: prose(
        "Today you compare two ways of building the same list. By the end, a pull request waits for review. Share the numbers, not the lesson time.",
        "Lazy work happens when you ask for a result. where and map build a plan and do no work yet. fold or toList runs the plan. Eager work happens at once, with a list built at every step. A plan is cheap until you run it.",
        "Dart's Stopwatch measures code, not the learner. Use it in a test to compare the two paths. With 100,000 prices the lazy path avoids extra copies. Record what you see, then stop.",
        "Write both runs in the same test file. Give each one a name that says lazy or eager. Run the file once and read the two numbers together.",
        "The winner is the path that does less work. Record the numbers, not a feeling about which one is faster.",
        "The failure is a toList call after every arrow. Each call allocates another copy of the whole list. Fix it by keeping the chain lazy until the final result. A lazy view re-runs if you use it twice, so call toList once before reusing it. One copy at the end is enough.",
        "A branch is a copy of the work where you try a change. A pull request asks someone to look before you merge. Open the request, then merge after the look. Keep one idea in each commit message. One idea per commit keeps the history readable.",
      ),
      resources: [
        { label: 'Collections', url: 'https://dart.dev/language/collections', kind: 'docs' },
        { label: 'Stopwatch', url: 'https://api.dart.dev/stable/dart-core/Stopwatch-class.html', kind: 'docs' },
      ],
      tasks: [
        "Open bin/bench.dart and add a list of 100 repeated prices.",
        "Run the lazy chain and the eager chain with Stopwatch.",
        "Make a branch, commit, open a pull request, then merge it.",
        "Check: the pull request page shows your commit and no failing test.",
      ],
      direction: "Do not merge before the review. Open the pull request first, then merge after someone looks.",
      designNote: "A report with a clear source earns trust. Show the number, then one line saying where it came from. Before: a total with no note. After: Total 60 and from 5 sales under it. The reader can check the answer without opening the code.",
      estMinutes: 110,
      origin: 'authored',
    },
    {
      day: 7,
      title: "Rebuild the engine from an empty file",
      summary: prose(
        "Today you prove Week 2 stuck. After this day, you can rebuild the snack analytics engine from an empty file with no notes.",
        "A blank file gives you no words to lean on. Start with the list, then the equality class, then the pipeline, then the print. Say three rules before you type. Keep a terminal open beside the file. Keep the paper beside the keyboard.",
        "A closure keeps its variable. A lazy chain runs when you pull it. Equal values need both == and hashCode. Write those sentences on paper first.",
        "The failure is false confidence from rereading. The blank file shows the gaps that notes hide. Write each gap down as you find it. A gap is a fact you could not write without looking. Compare with your Day 4 file only after you finish.",
        "Write from memory first, then check the file. The check comes after the attempt, never before.",
        "A rebuild is retrieval, not a test of memory speed. Write the first line even if it feels slow. The gap you cannot fill is the fact to write down.",
        "Stop when the report prints the total, the best seller and one row per product. Explain closures and value equality out loud in two sentences. The two sentences are part of the checkpoint, not an extra task.",
        "One idea per line keeps a rebuild calm. If a line needs two explanations, split it into two days of practice. Finish what you started before you open the old file.",
      ),
      resources: [
        { label: 'Functions', url: 'https://dart.dev/language/functions', kind: 'docs' },
        { label: 'Classes', url: 'https://dart.dev/language/classes', kind: 'docs' },
      ],
      tasks: [
        "Create a new console project and open an empty bin/report.dart.",
        "Write the Product class, the pipeline and the report without notes.",
        "Explain closures and value equality out loud in two sentences.",
        "Check: the output matches Day 4 and you wrote down every gap.",
      ],
      direction: "Do not open Day 4 while you rebuild. Finish first, compare second, so the check shows what you know.",
      designNote: "The report answers one question: which snack sold most? Remove every label that does not help. Before: a header, a logo and a greeting above the best seller. After: the best seller on the first line, the total beneath. The reader gets the answer before the decoration.",
      estMinutes: 95,
      origin: 'authored',
    },
  ],
}

export default week
