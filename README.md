# Spin Doctors 🎩🗳️

**Spin Doctors** is a political campaign management game with a satirical twist.

You are not the candidate. You are the hired gun — the spin doctor. Someone's
agent has put you on a retainer, handed you a budget and a list of objectives,
and told you what happens if you miss them. Everything else is optics.

If Football Manager is the model, the mapping is roughly:

| Football Manager   | Spin Doctors           |
| ------------------ | ---------------------- |
| Club               | Candidate              |
| Board              | Candidate and backers  |
| Board expectations | Contract objectives    |
| Match              | Election               |
| Player morale      | Candidate morale       |
| Getting sacked     | A worse candidate next |

## 🎮 The loop

Seven days, one move per day, then an election.

- 🗓️ **A contract up front.** Hit the objectives or you are out of a job.
- 🎭 **One move a day.** Canvass, stage a photo op, buy media, run an attack ad, or prep the candidate.
- 🎯 **Pick your target.** Most moves are aimed at a single voter group.
- 🔥 **A scandal lands mid-week.** Three ways to handle it, all of them bad.
- 🧠 **Candidate morale.** Grind them down and they go off-script in public, without you.
- 📊 **Polls that lie.** Published with a margin of error, and it is not decorative.

### The design rule

Relationships are **certain and legible** — you always see exactly which group
moved and by how much. Turnout is **uncertain** — whether they actually vote is
revealed only on election night. You always know what you did. You never quite
know whether it was enough.

## 🛠️ Tech stack

Deliberately minimal for the proof of concept. No backend, no database, no
OpenAPI, no PWA until the loop is proven fun.

- **App**: SvelteKit + TypeScript (strict), static adapter
- **Validation**: Zod — schemas double as writer contract and future LLM output schema
- **Tests**: Vitest
- **Sim engine**: pure, deterministic, zero framework imports
- **Saves**: seed + move list, URL-encodable

### Why the engine is pure

`applyMove(state, content, move)` is a deterministic function with no I/O. That
buys four things: replayable bug reports, a headless balance harness, a trivial
save format, and a cheap path to server-authoritative multiplayer later.

## 📁 Structure

```text
src/lib/sim/        # pure engine — may not import from svelte
src/lib/schema/     # Zod schemas -> inferred TypeScript types
src/lib/content/    # loads and validates the JSON at startup
src/routes/         # UI
content/            # voter groups, actions, events, gaffes, contract (writer-editable)
scripts/balance.ts  # headless harness: runs thousands of campaigns
```

All game content is JSON. Adding a scandal requires no code changes and no
TypeScript knowledge.

## 🚀 Running it

```bash
nvm use            # Node 24, see .nvmrc
npm install
npm run dev        # play it
npm test           # engine tests
npm run check      # typecheck
npm run balance    # balance report
```

## ⚖️ Balance

`npm run balance` plays thousands of campaigns under naive strategies and reports
the sack rate. The target for random play is **20–30%** — frequent enough to feel
real, rare enough that taking stupid risks is still worth it.

Current numbers (3,000 campaigns each):

| Strategy    | Sacked | Mean share |
| ----------- | ------ | ---------- |
| random      | 24.8%  | 41.4       |
| allAttack   | 100.0% | 23.2       |
| allDoorstep | 34.0%  | 47.1       |
| balanced    | 2.3%   | 43.9       |

Degenerate strategies are punished; skilled play clearly beats naive play.

## 🚧 Status

**Pre-alpha proof of concept.** The single-player weekly loop is playable end to
end. The next gate is putting it in front of five people, explaining nothing, and
seeing whether they laugh unprompted and ask to go again.

Nothing about multiplayer, PWA, backend, or art starts before that gate passes.

## 📌 Next

- [ ] Self-playtest and tune the numbers
- [ ] Deploy and share run links
- [ ] Playtest with five people
- [ ] Expand the content pass (more scandals, more groups)
- [ ] Career ladder: multiple contracts, real consequences for the sack

## 🤔 Why "Spin Doctors"?

Because in politics, **truth is optional — but optics are everything.**

## 🧠 Inspiration

- Football Manager
- Premier Manager
- Papers, Please
- Democracy 3
- Not For Broadcast

## 📜 License

[MIT](LICENSE)
