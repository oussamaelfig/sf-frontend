# Review standards for sf-frontend

Qodo Merge applies these project-specific standards when reviewing pull
requests on this repository.

## Architecture

- Data access is server-only: RSC pages and server actions call the API
  through `src/lib/contacts/api.ts`. Client components never fetch the
  backend directly, so the base URL stays private and CORS never applies.
- Form fields are metadata-driven from `CONTACT_FIELD_GROUPS` in
  `src/lib/contacts/schema.ts`; custom controls (photo picker, address
  editor) submit through hidden inputs collected by `formDataToValues`.
- Zod schemas mirror the API's Pydantic contract exactly — same limits,
  same required fields — so users see mistakes before a round trip while
  the API stays the authority.

## React / Next.js

- App Router with React 19: server actions via `useActionState`, forms
  that work before hydration, `redirect()` outside try/catch.
- Async client-side work that feeds a submit must gate the submit (busy
  state) and invalidate stale results (generation tokens); no
  fire-and-forget state updates after `await`.
- Types stay snake_case to map 1:1 onto the wire format.

## Styling

- Tailwind with design-system tokens only (`text-foreground`,
  `bg-secondary`, `border-hairline`…); raw color classes are a review
  failure because they break dark mode.
- Avatars and images: `rounded-full aspect-square object-cover`.

## Tests

- Jest + Testing Library + MSW. Every contract change updates
  `src/__tests__/mocks/handlers.ts` and the affected suites in the same
  PR. `npm run typecheck`, `npm run lint`, and `npm test` must all pass.

## Diff hygiene

- Minimal diffs: no dead code, no generated artifacts (AGENTS.md,
  CLAUDE.md), no unrelated formatting churn.
