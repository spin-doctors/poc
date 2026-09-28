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

A career of campaigns. Each campaign is a week or so, one move per day, then an
election; between campaigns, you pick your next client from whoever is calling.

- 🗓️ **A contract up front.** Hit the objectives or you are out of a job.
- 🎭 **One move a day.** Canvass, stage a photo op, buy media, run an attack ad, or prep the candidate.
- 🗳️ **Commission a poll.** Spend a day and campaign money to see the projected vote share for each move tomorrow; better samples cost more and come with a tighter margin.
- 🎯 **Pick your target.** Most moves are aimed at a single voter group.
- 🎙️ **An opportunity lands early.** Take the podcast or turn it down — and if you take it, decide what to drill him on.
- 🔥 **A scandal lands mid-week.** Three ways to handle it, all of them bad.
- 🏢 **Reality occasionally glitches.** Back a data-centre blockade and watch the campaign feed develop an entirely temporary problem.
- 🔓 **Unlockable moves.** Your own credibility and ruthlessness decide what you get offered.
- 🧠 **Candidate morale.** Grind them down and they go off-script in public, without you.
- 📊 **Polls that lie.** Published with a margin of error, and it is not decorative.

### The career

Your credibility, ruthlessness and personal funds carry from one campaign to
the next, so a clean week at Ashcombe can mean starting the next job with the
Inside Track already open. Keeping an account pays the contract's **fee** into
your personal funds and earns **recognition**: a base amount per contract, plus one for every point you
beat the vote-share target by (up to ten). Being sacked pays
nothing, costs recognition, and the only phone that rings is the contract's
`fallback` — a worse candidate.

| Scenario                          | Tier          | Days | Fee     | Who will hire you                         |
| --------------------------------- | ------------- | ---- | ------- | ----------------------------------------- |
| Ashcombe South (Bramley)          | council       | 7    | £12,000 | anyone; where every career starts         |
| Pendle Hurst West (Malcolm)       | council       | 7    | £4,000  | recognition 15 or below                   |
| Harwell and Stoke Minster (Priya) | parliamentary | 10   | £30,000 | recognition 12+, ruthlessness 70 or below |

Locked offers stay visible with their requirements, like locked moves. The
career is saved in `localStorage` as the career seed plus each campaign's seed
and moves, and rebuilt by replay on load. Share links still cover a single
campaign, and carry its scenario and starting stats so it replays exactly;
opening one never touches your own career. Links from before scenarios existed
replay Ashcombe.

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
src/lib/sim/        # pure engine and career layer — may not import from svelte
src/lib/schema/     # Zod schemas -> inferred TypeScript types
src/lib/content/    # loads, merges and validates the JSON at startup
src/routes/         # UI
content/            # shared actions and gaffes (writer-editable)
content/scenarios/  # one folder per campaign: contract, voter groups, events
scripts/balance.ts  # headless harness: runs thousands of campaigns per scenario
```

All game content is JSON. Adding a scandal requires no code changes and no
TypeScript knowledge. Adding a scenario means a new folder and one import in
`src/lib/content/index.ts`.

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

`npm run balance` plays thousands of campaigns per scenario under naive
strategies and reports the sack rate; `npm run balance -- 1000 <scenario-id>`
runs one. The target for random play is **20–30%** in every scenario — frequent
enough to feel real, rare enough that taking stupid risks is still worth it.
The harness plays each scenario from its contract's default stats, not with
carried-over career stats.

Current numbers for Ashcombe (4,000 campaigns each):

| Strategy             | Sacked | Mean share | Notes                                             |
| -------------------- | ------ | ---------- | ------------------------------------------------- |
| random               | 18.9%  | 61.1       | random campaign moves; 100% branch lifts the mean |
| randomIncludingPolls | 31.9%  | 58.8       | commissions polls without using reports           |
| pollWise             | 2.0%   | 63.1       | buys a full poll, chooses by forecast             |
| allAttack            | 100.0% | 50.1       | degenerate control; morale still collapses        |
| allDoorstep          | 28.4%  | 65.9       | high share, candidate morale is fragile           |
| balanced             | 3.5%   | 62.9       | safe, unlocks nothing                             |
| cleanHands           | 6.3%   | 62.2       | credibility path                                  |
| bareKnuckle          | 14.9%  | 61.5       | ruthless path, higher variance                    |

The two identity paths land close on mean share but differ on risk, which is the
intended shape: going dirty should be a gamble, not a strictly worse choice.
These figures now include the low-probability data-centre branch: backing the
blockade produces the guaranteed 100% support result, but does not waive the
separate candidate-morale contract objective.

The other scenarios, random / pollWise / balanced / cleanHands / bareKnuckle sacked:

| Scenario              | random | pollWise | balanced | cleanHands | bareKnuckle |
| --------------------- | ------ | -------- | -------- | ---------- | ----------- |
| council-pendle        | 29.1%  | 0.1%     | 4.9%     | 4.3%       | 36.6%       |
| parliamentary-harwell | 28.9%  | 10.7%    | 22.8%    | 3.6%       | 33.1%       |

Harwell is ten days with four groups, and the photo-op-spamming `balanced`
strategy stops being safe there. `allDoorstep` is sacked 77.5% of the time
because the morale objective is stricter.

### Commissioning polls

There are three tiers: a £2,500 quick poll (±5 points), a £6,000 constituency
poll (±3), and a £12,000 full-sample poll (±1.5). Commissioning spends that day's
move but does not change support or turnout. On the following day, each
available campaign move shows its projected vote share and the poll's margin;
the report expires after that day's move. A poll cannot be commissioned on the
final day because there would be no time to act on it.

The projection shows a central estimate from the expected-turnout model, not a
promise about election night. Poll-informed play performs better in the balance
harness; commissioning polls randomly without consulting their reports is
deliberately costly in both time and money.

### Known tuning issue

`balanced` — spamming staged photo ops — currently has both the lowest sack rate
and a high mean share in the council scenarios, making the safe middle a little
too strong there. The career layer now gives it a cost: it drifts credibility
down and unlocks nothing to carry forward, and it is far riskier at Harwell.
Carried-over credibility also means a clean career can open the Inside Track
from day one, which the harness does not yet measure. Worth revisiting after
playtesting.

### Events are data, including branching ones

An event response may carry `next`, which chains into another event instead of
ending the day — that is how the podcast offer leads into the prep choice. A
response may carry `nextDay` to queue a follow-up after advancing one day. Events
without a `day` are only reachable by chaining. A response may also set
`riskGaffe`, which lets a low-morale candidate embarrass you on that specific
choice. Events can opt into a `corrupted-feed` presentation for a readable,
interactive narrative outage; it never breaks real navigation or controls.

The day-5 data-centre story is a deliberately surreal branch: backing the
blockade schedules an outage the next day and a restoration reveal after that.
The reveal changes the candidate's recorded position, clamps all support to
100%, and resolves through the normal election flow. The whole outcome replays
deterministically from the seed and move history.

### Actions are data too, including locked ones

An action may carry `requires`, a list of `{ stat, min, label }`. The label is
shown to the player while the action is locked, so requirements read as goals.
Adding a new unlockable is a content change, not a code change. Poll actions use
`pollMargin` and an empty `effects` array; the engine stores a next-day report
instead of changing voter stats.

## � Deployment

Deployed to GitHub Pages by Actions on every push to `main`:
**https://spin-doctors.github.io/poc/**

- [ci.yml](.github/workflows/ci.yml) — typecheck, tests, a balance smoke run and a build, on every push and PR
- [deploy.yml](.github/workflows/deploy.yml) — builds with `BASE_PATH=/poc` and publishes to Pages

The build is fully static, so there is nothing to run server-side. GoatCounter
analytics are optional and remain disabled until configured.

### One-time setup

In **Settings → Pages**, set **Source** to **GitHub Actions**. Until that is
done the deploy job will fail.

### Optional analytics setup

To enable privacy-focused pageview and basic campaign analytics:

1. Create a hosted site at [GoatCounter](https://www.goatcounter.com/) and note
   its count endpoint, such as `https://<site-code>.goatcounter.com/count`.
2. In **Settings → Secrets and variables → Actions → Variables**, add
   `PUBLIC_GOATCOUNTER_URL` with that endpoint. It is public configuration, not
   a secret.
3. Deploy the site and check the GoatCounter dashboard. Leave the variable
   unset to disable analytics.

Only campaign starts, kept/sacked outcomes, and successful share-link copies
are recorded as named events. Replay codes and gameplay details are not sent.

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
