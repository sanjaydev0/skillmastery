import type { Subject } from '../../types/schema'
import { fullstackFoundation } from './fullstackWeeks1to12'
import { fullstackSystems } from './fullstackWeeks13to24'

export const fullstackSubject: Subject = {
  id: 'fullstack',
  name: 'Full-Stack Web, Product Design & Systems',
  shortName: 'Full-stack',
  tagline:
    'A 24-week mastery track: semantic web foundations, React and Postgres, auth, testing, offline PWAs, Node, queues, security, and production operations.',
  accent: 'emerald',
  phases: [
    {
      id: 'fs-p1',
      name: 'Phase 1 · Web foundations',
      subtitle: 'Semantic HTML, CSS systems, JavaScript, TypeScript, React and Next.js',
    },
    {
      id: 'fs-p2',
      name: 'Phase 2 · Data & interfaces',
      subtitle: 'Postgres, auth and RLS, HTTP, caching, validation and testing',
    },
    {
      id: 'fs-p3',
      name: 'Phase 3 · Systems',
      subtitle: 'Offline web, service workers, Node, API design, containers and observability',
    },
    {
      id: 'fs-p4',
      name: 'Phase 4 · Scale & operations',
      subtitle: 'Caching, queues, security, performance, CI/CD and the production capstone',
    },
  ],
  weeks: [...fullstackFoundation.weeks, ...fullstackSystems.weeks],
  nodes: [...fullstackFoundation.nodes, ...fullstackSystems.nodes],
  cards: [...fullstackFoundation.cards, ...fullstackSystems.cards],
  resources: [...fullstackFoundation.resources, ...fullstackSystems.resources],
}
