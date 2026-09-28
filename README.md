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
- 🎙️ **An opportunity lands early.** Take the podcast or turn it down — and if you take it, decide what to drill him on.
- 🔥 **A scandal lands mid-week.** Three ways to handle it, all of them bad.
- 🔓 **Unlockable moves.** Your own credibility and ruthlessness decide what you get offered.
- 🧠 **Candidate morale.** Grind them down and they go off-script in public, without you.
- 📊 **Polls that lie.** Published with a margin of error, and it is not decorative.

### Two ways to be good at this

You have two stats of your own, and they pull against each other. Honest graft
raises **credibility**; attack ads and dirty tricks raise **ruthlessness** while
burning credibility down.

| Path            | Unlocks              | What it buys                                                         |
| --------------- | -------------------- | -------------------------------------------------------------------- |
| Credibility 68  | **The Inside Track** | Tightens your poll's margin of error — the only way to buy certainty |
| Ruthlessness 45 | **Throw a Dead Cat** | A huge, cheap swing at one group, and a bill your candidate pays     |

Locked moves are **visible from day one** with their thresholds shown, so they
shape the whole week rather than arriving as a late surprise. Playing the safe
middle unlocks neither.

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

Current numbers (4,000 campaigns each):

| Strategy    | Sacked | Mean share | Notes                          |
| ----------- | ------ | ---------- | ------------------------------ |
| random      | 26.9%  | 41.9       | naive play, the target band    |
| allAttack   | 100.0% | 25.3       | degenerate control             |
| allDoorstep | 34.3%  | 48.8       | great share, wrecked candidate |
| balanced    | 5.9%   | 44.5       | safe, unlocks nothing          |
| cleanHands  | 13.4%  | 43.3       | credibility path               |
| bareKnuckle | 22.9%  | 42.3       | ruthless path, higher variance |

The two identity paths land close on mean share but differ on risk, which is the
intended shape: going dirty should be a gamble, not a strictly worse choice.

### Known tuning issue

`balanced` — spamming staged photo ops — currently has both the lowest sack rate
and a high mean share, making the safe middle a little too strong. Its real cost
(drifting to low credibility with nothing to show for it) only bites once the
career layer exists. Worth revisiting after playtesting.

### Events are data, including branching ones

An event response may carry `next`, which chains into another event instead of
ending the day — that is how the podcast offer leads into the prep choice. Events
without a `day` are only reachable by chaining. A response may also set
`riskGaffe`, which lets a low-morale candidate embarrass you on that specific
choice. Arbitrary branching event trees need no engine changes.

### Actions are data too, including locked ones

An action may carry `requires`, a list of `{ stat, min, label }`. The label is
shown to the player while the action is locked, so requirements read as goals.
Adding a new unlockable is a content change, not a code change.

## � Deployment

Deployed to GitHub Pages by Actions on every push to `main`:
**https://spin-doctors.github.io/poc/**

- [ci.yml](.github/workflows/ci.yml) — typecheck, tests, a balance smoke run and a build, on every push and PR
- [deploy.yml](.github/workflows/deploy.yml) — builds with `BASE_PATH=/poc` and publishes to Pages

No secrets or third-party accounts are needed. The build is fully static, so
there is nothing to run server-side.

### One-time setup

In **Settings → Pages**, set **Source** to **GitHub Actions**. Until that is
done the deploy job will fail — it is the only manual step.

### Base path

Project pages serve from `/<repo>`, so the deploy workflow sets `BASE_PATH`.
Locally `BASE_PATH` is unset and everything serves from `/`. To reproduce the
deployed layout:

```bash
BASE_PATH=/poc npm run build
```

Moving to a custom domain later means dropping `BASE_PATH` from the workflow.

## �🚧 Status

**Pre-alpha proof of concept.** The single-player weekly loop is playable end to
end. The next gate is putting it in front of five people, explaining nothing, and
seeing whether they laugh unprompted and ask to go again.

Nothing about multiplayer, PWA, backend, or art starts before that gate passes.

## 📌 Next

- [ ] Self-playtest and tune the numbers
- [x] Deploy and share run links
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

[Apache-2.0](LICENSE)
