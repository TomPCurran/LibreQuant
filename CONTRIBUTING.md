# Contributing to LibreQuant

## Local development setup

Follow the root [README.md](README.md) **Quick start**: clone → `cd LibreQuant/librequant` → `cp .env.example .env.local` → `npm install` → `npm run dev:stack` → open http://localhost:3000.

From `librequant/`:

- Tests: `npm run test`
- Lint: `npm run lint`
- Typecheck: `npx tsc --noEmit`

## Branch naming

- `feature/<short-description>`
- `fix/<short-description>`
- `docs/<short-description>`

## Before opening a PR

- [ ] `npm run test` passes
- [ ] `npm run lint` exits 0 (no errors; warnings acceptable)
- [ ] `npx tsc --noEmit` exits 0
- [ ] No `console.log` in production paths
- [ ] New API routes have co-located tests
- [ ] New components under 250 lines (when applicable)
- [ ] README/docs updated if behavior changed

## Code style

- TypeScript strict mode (`librequant/tsconfig.json`)
- ESLint: `librequant/eslint.config.mjs`
- No `any` types, no `@ts-ignore`
- Use `lib/client-log.ts` instead of `console.error` in components

## Architecture decisions

See [AUDIT.md](AUDIT.md) for the current architecture. For significant changes, open an issue first to discuss the approach.
