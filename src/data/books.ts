import type { Book } from '../types/schema'
import { seedBook } from './seedHelpers'

/**
 * The 30-minute passive canon. Shared across tracks because the reading habit
 * is language-agnostic, and duplicating progress would be a lie.
 */
export const seedBooks: Book[] = [
  seedBook({
    id: 'book-think-like-programmer',
    title: 'Think Like a Programmer',
    author: 'V. Anton Spraul',
    pillar: 'Problem solving',
    url: 'https://nostarch.com/thinklikeaprogrammer',
    totalChapters: 8,
    weekFrom: 1,
    weekTo: 4,
  }),
  seedBook({
    id: 'book-design-everyday-things',
    title: 'The Design of Everyday Things',
    author: 'Don Norman',
    pillar: 'UI/UX & human psychology',
    url: 'https://jnd.org/books/the-design-of-everyday-things-revised-and-expanded-edition/',
    totalChapters: 7,
    weekFrom: 5,
    weekTo: 8,
  }),
  seedBook({
    id: 'book-refactoring-ui',
    title: 'Refactoring UI',
    author: 'Adam Wathan & Steve Schoger',
    pillar: 'UI/UX & visual craft',
    url: 'https://www.refactoringui.com/',
    totalChapters: 12,
    weekFrom: 5,
    weekTo: 8,
  }),
  seedBook({
    id: 'book-common-sense-dsa',
    title: 'A Common-Sense Guide to Data Structures and Algorithms',
    author: 'Jay Wengrow',
    pillar: 'Algorithms & data structures',
    url: 'https://pragprog.com/titles/jwdsal2/a-common-sense-guide-to-data-structures-and-algorithms-second-edition/',
    totalChapters: 20,
    weekFrom: 9,
    weekTo: 13,
  }),
  seedBook({
    id: 'book-philosophy-software-design',
    title: 'A Philosophy of Software Design',
    author: 'John Ousterhout',
    pillar: 'Software design',
    url: 'https://web.stanford.edu/~ouster/cgi-bin/book.php',
    totalChapters: 24,
    weekFrom: 14,
    weekTo: 18,
  }),
  seedBook({
    id: 'book-pragmatic-programmer',
    title: 'The Pragmatic Programmer',
    author: 'David Thomas & Andrew Hunt',
    pillar: 'Software craftsmanship',
    url: 'https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/',
    totalChapters: 9,
    weekFrom: 14,
    weekTo: 18,
  }),
  seedBook({
    id: 'book-ddia',
    title: 'Designing Data-Intensive Applications',
    author: 'Martin Kleppmann',
    pillar: 'Data-intensive systems',
    url: 'https://dataintensive.net/',
    totalChapters: 12,
    weekFrom: 19,
    weekTo: 24,
  }),
]
