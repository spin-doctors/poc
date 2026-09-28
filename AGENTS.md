# Project Instructions

## Setup and Commands

- Use Node `24.21.0` from `.nvmrc`; install with `npm ci`.
- Run `npm run dev` for local play, `npm run check` for type/Svelte checks, and `npm test` for tests.
- After changing simulation or game content, run `npm run balance -- 1000` as well as the relevant tests.
- Run `npm run build` before considering a change complete. To check the GitHub Pages path locally, use `BASE_PATH=/poc npm run build`.
- `npm run knip` checks for unused files and exports. Formatting is Prettier; the pre-commit hook formats staged files.

## Architecture

- Keep `src/lib/sim/` deterministic and independent of Svelte, browser APIs, and I/O. Game behavior belongs in the simulation; the route renders state and dispatches moves.
- Treat `content/*.json` and `content/scenarios/*/*.json` as writer-authored data and `src/lib/schema/content.ts` as its Zod contract. Actions and gaffes are shared; each scenario folder holds its own contract, voter groups and events. Prefer adding actions, effects, and branching events as data over special-casing them in the engine.
- Saves and share links are reconstructed from the seed and move history. Preserve deterministic replay when changing random behavior or move handling. The career (`src/lib/sim/career.ts`) is rebuilt by replaying each campaign record, and share links must carry the scenario id and starting stats.
- This is a static SvelteKit app. Keep deployment compatible with `adapter-static`; the deploy workflow supplies `BASE_PATH` for GitHub project pages.

## Content and Balance

- When adding an effect stat, update the schema and the engine's global-stat handling together; add tests for its bounds and feedback formatting.
- Keep action requirements tied to numeric stats in `GameState`, and ensure the UI can explain unmet requirements using the content label.
- Event `day` values schedule top-level events; response `next` values chain immediately, while `nextDay` queues an event after advancing the day. Keep presentation effects such as `corrupted-feed` readable and interactive. Update content-integrity and replay tests when changing event flows.
- Preserve at least one free, unlocked action so a player with no campaign budget can still take a turn.
- Every scenario should land random play at a 20–30% sack rate in `npm run balance`; shared actions that name a group (e.g. `retirees`) need that group in every scenario.
- Use `src/lib/sim/engine.test.ts` and `src/lib/share.test.ts` as the local examples for simulation and replay coverage.

See [README.md](README.md) for the game loop, directory overview, deployment setup, and current balance notes. CI runs typecheck, tests, a balance smoke run, and a production build via [.github/workflows/ci.yml](.github/workflows/ci.yml).
