# Spin Doctors 🎩🗳️

**Spin Doctors** is a political campaign management game with a satirical twist.

You are not the candidate. You are the hired gun — the spin doctor. Someone's
agent has put you on a retainer, handed you a budget and a list of objectives,
and told you what happens if you miss them. Everything else is optics.

If Football Manager is the model, the mapping is roughly:

| Football Manager     | Spin Doctors           |
| -------------------- | ---------------------- |
| Club                 | Candidate              |
| Board                | Candidate and backers  |
| Board expectations   | Contract objectives    |
| Match                | Election               |
| Player morale        | Candidate morale       |
| Getting sacked       | A worse candidate next |
| Nobody will hire you | Game over              |

## 🎮 The loop

One campaign at a time. A new player is dropped straight into the Ashcombe
South council by-election: a week or so of one move per day, then an election.
After each move and any event responses, wait for **local midnight**; the election is called when the
final day ends, and then the next client calls. Missed days still pass and cost
5 morale per unfinished day. On returning, the game catches up offline, stopping
at the current campaigns' elections rather than accepting future jobs for you.
Who calls next depends on how
you did — a strong win gets you promoted, a sacking gets you a worse
candidate. There is no dashboard and no candidate picker; funds and fees stay
out of sight except for optional bonus rewards.

The full career — a dashboard with an offers board, several accounts at once,
— sits
behind the experimental flag in **Settings** (☰ menu). There, days pass for
every account at once, and an account left without a move for the day loses
the day and some candidate morale. **Tester: allow immediate day advancement**
is a separate Settings option, off by default. It pauses automatic progression
and exposes manual next-day buttons in both solo and dashboard play. Returning
to normal play reanchors to today's date without replaying tester days.

- 🗓️ **A contract up front.** Hit required objectives or you are out of a job; optional goals pay bonuses if you keep the account.
- 🎭 **One move a day.** Canvass, stage a photo op, buy media, run an attack ad, or prep the candidate.
- 🗳️ **Commission a poll.** Spend campaign money, not your daily move, on one private poll per account per day. Tomorrow's report shows candidate standings, group breakdowns and action forecasts.
- 🎯 **Pick your target.** One card per action. Doorstep canvassing opens a voter-group choice; attack ads open an opponent choice. Other actions are broad.
- 📰 **Read the papers.** Public polling, scandals and gaffes have newspaper snippets and a replayable archive. Paid reports stay private.
- 🗑️ **A full field.** Two main rivals in every seat; parliamentary races also include Count Binface and a Monster Raving Loony Party candidate. Novelty contenders start at no more than 2% per group, never gain support, are attackable, and never become clients.
- 🎙️ **An opportunity lands early.** Take the podcast or turn it down — and if you take it, decide what to drill him on.
- 🔥 **A scandal lands mid-week.** Three ways to handle it, all of them bad.
- 🏢 **Reality occasionally glitches.** Back a data-centre blockade and watch the campaign feed develop an entirely temporary problem.
- 🔓 **Unlockable moves.** Your own credibility and ruthlessness decide what you get offered.
- 🧠 **Candidate morale.** Grind them down and they go off-script in public, without you.
- 📊 **Polls that lie.** Published with a margin of error, and it is not decorative.

### The career

Your credibility, ruthlessness and funds are one shared pool across every
account you run, so a clean day at Ashcombe can open the Inside Track in
another campaign. Keeping an account pays the contract's **fee** into
your personal funds and earns **recognition**: a base amount per contract, plus one for every point you
beat the vote-share target by (up to ten). Being sacked pays
nothing, costs recognition, and the only phone that rings is the contract's
`fallback` — a worse candidate. A contract with no fallback is the bottom
rung: be sacked there and the career is over, with an epilogue from
`content/epilogues.json` about where you end up instead. Contracts can also
declare an `appeal` (credibility or ruthlessness weights); when several clients
at the same tier would hire you, the one whose appeal best matches your record
calls first, so a ruthless operator draws shadier clients.

An **early scandal dismissal** is different: a caught ruthless special can get you
thrown under the bus immediately. That account closes without an election result,
fee or bonus. Credibility and recognition losses persist, but your career stays
open, other accounts continue, and another eligible client can call without the
forced fallback. The usual election-objective sacking ladder is unchanged.

| Scenario                            | Tier          | Days | Fee     | Who will hire you                         |
| ----------------------------------- | ------------- | ---- | ------- | ----------------------------------------- |
| Ashcombe South (Bramley)            | council       | 7    | £12,000 | anyone; where every career starts         |
| Pendle Hurst West (Malcolm)         | council       | 7    | £4,000  | recognition 15 or below; the bottom rung  |
| Harwell and Stoke Minster (Priya)   | parliamentary | 10   | £30,000 | recognition 12+, ruthlessness 70 or below |
| Gravesend Fen and North Quay (Vale) | parliamentary | 8    | £35,000 | ruthlessness 75+                          |
| Blackmere and West Docks (Voss)     | parliamentary | 9    | £45,000 | ruthlessness 85+                          |

In the simple game the next client is chosen for you: the highest-tier
contract you qualify for, avoiding an immediate repeat. With experimental
features on, locked offers stay visible with their requirements, like locked
moves. Alone you can run one account at a time; incorporate a company (an experimental
feature: turn it on in **Settings** from the ☰ menu), then hire staff
(a one-off fee plus a daily wage from company cash) to run one more account
per staffer, never the same seat twice at once. The career is saved in
`localStorage` as the career seed plus an ordered log of accepts, moves, day
ticks, incorporation and hires, and rebuilt by replay on load. Saves from
before the special-action risk rules are deliberately reset with an explanatory notice;
settings are preserved. This is an unreleased game. Calendar metadata is stored alongside the replay log,
not inside the deterministic simulation.

Council clients offer an optional win bonus (Ashcombe: £3,000 and 2 recognition;
Pendle: £2,000 and 3 recognition). Harwell requires winning and pays an extra
£8,000 and 3 recognition for exceeding 50% vote share. A tied lead is not a win;
exactly 50% is not an above-50% bonus. Bonuses are paid only when all required
objectives are met, into personal funds or company cash as appropriate.

### Two ways to be good at this

You have two stats of your own, and they pull against each other. Honest graft
raises **credibility**; attack ads and dirty tricks raise **ruthlessness** while
burning credibility down.

| Path            | Unlocks              | What it buys                                                         |
| --------------- | -------------------- | -------------------------------------------------------------------- |
| Credibility 68  | **The Inside Track** | Tightens your poll's margin of error — the only way to buy certainty |
| Ruthlessness 45 | **Throw a Dead Cat** | A broad, cheap distraction, and a bill your candidate pays           |

Specials appear in **Credibility**, **Ruthlessness** and **Personal funds** tracks:
all currently unlocked actions plus only the next locked action in each track.
Content order defines progression. Unlocks use current stats; spending credibility
can lock an action again. Budget affordability does not hide the next unlock.

Every special opens a **risk confirmation** before commitment, after any target
choice. It shows the budget cost, reputation spend, conditional reward, failure or
detection chance, failure consequences and both conditional/overall dismissal
probabilities. Cancel changes neither state nor RNG. Risky specials are not shown
as guaranteed polling forecasts.

Credibility actions are favours, verified disclosures and public endorsements.
Each spends 3–6% of current credibility even on success. Failure grants no success
reward and costs a further 12–20% of credibility **before the attempt**.
Both percentage amounts round to one decimal point; failure losses are capped at
what remains. Ruthless actions range from diversionary scandals to fictional
framing and voter fraud: 25–50% detection risk, with a 12–25% chance of dismissal
**if caught**, plus 15–35% progressive credibility loss and authored backlash.
These are satirical game abstractions, not descriptions of how to commit crimes.

Vale halves conditional dismissal risk; Voss multiplies it by 0.4. A 1% conditional
dismissal floor prevents any client from making it safe. The personal cheque is a certain transaction, showing its fixed financial
and reputation costs rather than inventing a random failure.

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
- **Saves**: career seed + an ordered log of career entries

### Why the engine is pure

`applyMove(state, content, move)` is a deterministic function with no I/O; the
career uses its two halves, `playTurn` and `endDay`, so moves and day ticks can
interleave across accounts. That
buys four things: replayable bug reports, a headless balance harness, a trivial
save format, and a cheap path to server-authoritative multiplayer later.

## 📁 Structure

```text
src/lib/sim/        # pure engine and career layer — may not import from svelte
src/lib/schema/     # Zod schemas -> inferred TypeScript types
src/lib/content/    # loads, merges and validates the JSON at startup
src/lib/components/ # dashboard, campaign, career and election-night views
src/routes/         # UI shell
content/            # shared actions, gaffes and game-over epilogues (writer-editable)
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

## 📱 iOS shell

The Capacitor iOS shell bundles the static SvelteKit build in a native WebView.
The app can launch without a network connection, though online services such as
analytics will be unavailable.

The viewport uses `viewport-fit=cover`; the existing safe-area padding then
clears the iPhone's status bar/Dynamic Island and the home indicator, including
landscape side insets, without adding fixed extra spacing to desktop browsers.

Internal pages, including the privacy policy, have a **Back to the game** link.
External websites open in the device's browser, leaving the game available in the
app. On the web, external links open a separate tab.

### Daily reminders (iOS and Android)

Settings can opt into on-device reminders using `@capacitor/local-notifications`.
Permission is requested only when enabling reminders. No backend, push token or
remote messaging service is needed. The daily reminder time defaults to **09:00
local time** and can be changed in Settings. Game days still open at midnight.
Daily action reminders are sent only when a normal campaign move or event response
remains in at least one account; optional polling alone does not count. Completing
all moves and event responses cancels today's pending reminder. Opening the app
before the selected time does not postpone a reminder if work remains.

Future campaign dates and separate election-result reminders are scheduled ahead
of time and replaced/cancelled when campaigns, settings or the local calendar
change. An election reminder remains until its results have been shown or the
scheduled time has passed. Reminders are suppressed in tester mode.
Only this game's notification IDs are cancelled.

OS delivery is best-effort and may be late, particularly under power-saving
restrictions. Exact-alarm privileges are not required. The calendar, not receipt
of a notification, controls progression. Notification taps reconcile the calendar;
they reveal a single active campaign or the latest result, or the dashboard
when multiple accounts are running. The web game does not request notification permission.
Reminder times follow the device's local timezone; returning to the app reschedules
them if the timezone has changed. A nonexistent DST time moves to the next valid
wall-clock time, and a repeated hour does not produce two reminders. The app cannot
inspect game state while it is terminated; it updates eligibility when it observes
moves, event responses or calendar changes.

After changes, build without `BASE_PATH` and run `npm run ios:sync` and
`npx cap sync android` to update native assets/plugin wiring. Test permissions,
background delivery, opt-out and notification taps on real devices before release.
Saves stay in the iOS app's WebView storage and
are separate from Safari and other app installations. Web changes reach the
iOS app with a new app build, rather than immediately through the hosted site.

On macOS with Xcode installed:

```bash
nvm use
npm ci
npm run build
npm run ios:sync
npm run ios:open
```

In Xcode, select the **App** scheme and an iPhone simulator or connected device.
For a physical device or TestFlight, configure signing with an Apple Developer
account. `npm run ios:run` builds and launches on a selected simulator/device.

The bundle identifier in `capacitor.config.ts` is provisional and must be
changed to an identifier you control before signing or distributing the app.
Review App Store requirements before public submission.

### App Store Connect metadata (English - U.K.)

#### Description

```text
Run the campaign. Shape the story. Keep your job.

Spin Doctors is a satirical campaign-management game where you play the strategist behind fictional candidates. Win voters, manage morale and meet the contract, while building a career from one election to the next.

Make one campaign move each real-world day. Canvass, court the media, prepare the candidate or go on the attack. Commission a private poll as an additional daily purchase. Optional on-device reminders tell you when the next day opens.

Polls show what might happen, not what will. Read newspaper snippets, study your rivals, and aim for optional contract bonuses. Scandals branch, turnout is uncertain, and a candidate can go off-script. At election night, see the full candidate count.

Build recognition and funds across campaigns. Incorporate a company and hire staff to run multiple accounts. Earn access to tougher contracts and new tactics as your reputation develops.

Features:
- Three fictional election scenarios
- Day-by-day, turn-based campaign decisions
- Branching events and election-night results
- Career progression, company management and hiring
- Replayable single-player game with local saves

Spin Doctors is a single-player satirical game. All campaign scenarios and characters are fictional.
```

#### Keywords (89 characters)

```text
election,campaign,strategy,management,politics,voters,polling,simulator,turn-based,satire
```

#### Support URL

```text
https://github.com/spin-doctors/poc/issues
```

## ⚖️ Balance

`npm run balance` plays thousands of campaigns per scenario under naive
strategies and reports the sack rate; `npm run balance -- 1000 <scenario-id>`
runs one. The target for random play is **20–30%** in every scenario — frequent
enough to feel real, rare enough that taking stupid risks is still worth it.
The harness plays each scenario from its contract's default stats, not with
carried-over career stats.

Current numbers for Ashcombe (1,000 campaigns per strategy, special-risk rules):

| Strategy             | Sacked | Mean share | Notes                                                |
| -------------------- | ------ | ---------- | ---------------------------------------------------- |
| random               | 22.1%  | 61.8       | random campaign moves; 100% branch lifts the mean    |
| randomIncludingPolls | 28.6%  | 60.8       | buys auxiliary polls without using reports           |
| pollWise             | 3.8%   | 64.9       | buys a full poll, chooses by forecast                |
| allAttack            | 100.0% | 50.1       | degenerate control; morale still collapses           |
| allDoorstep          | 28.5%  | 65.8       | high share, candidate morale is fragile              |
| balanced             | 12.7%  | 62.6       | safe, unlocks nothing                                |
| cleanHands           | 20.8%  | 61.5       | credibility path                                     |
| bareKnuckle          | 37.0%  | 58.6       | repeated diversions now risk detection and dismissal |

The two identity paths differ on risk and career reputation.
These figures now include the low-probability data-centre branch: backing the
blockade produces the guaranteed 100% support result, but does not waive the
separate candidate-morale contract objective.

The other scenarios, random / pollWise / balanced / cleanHands / bareKnuckle sacked:

| Scenario                | random | pollWise | balanced | cleanHands | bareKnuckle |
| ----------------------- | ------ | -------- | -------- | ---------- | ----------- |
| council-pendle          | 29.4%  | 0.0%     | 1.6%     | 3.4%       | 55.5%       |
| parliamentary-harwell   | 30.0%  | 0.0%     | 0.0%     | 1.9%       | 40.6%       |
| parliamentary-gravesend | 30.0%  | 0.0%     | 0.0%     | 0.3%       | 11.6%       |
| parliamentary-blackmere | 29.5%  | 0.0%     | 0.0%     | 0.0%       | 10.0%       |

Harwell still requires an outright win and morale at least 30; its share target
is 39.5% and Pendle's is 37.9% after special-risk tuning. Ashcombe remains 40.5%.
The new clients start the isolated harness at eligible ruthlessness 75/85;
actual careers must earn those stats. Their early-sack rates under random play
are 10.7% and 10.5%, included in the total sack rates above. Early-dismissal
shares in the harness are pre-dismissal public estimates, not fabricated
election results. `reckless` repeatedly tries the highest available ruthless
special to expose the cost of spamming criminal schemes; `bareKnuckle` prefers
the lower-risk diversion and rests when morale falls.
At these settings `reckless` gets sacked in 100% of both nefarious-client runs,
with 31.6% (Vale) and 30.9% (Voss) ending in early dismissal. Client tolerance is
not a licence to spam the most extreme schemes.

### Commissioning polls

There are three tiers: a £2,500 quick poll (±5 points), a £6,000 constituency
poll (±3), and a £12,000 full-sample poll (±1.5). Commissioning is a separate
`poll` move: it spends budget but neither uses the normal turn nor triggers a
gaffe or scheduled event. One purchase is allowed per account per day, including
after the normal action or while a story awaits a response.
Open **Opponents & public polling** to see the field, public estimates,
commissioning controls and private-report archive. This is a separate collapsible
panel below the campaign actions; its contents are hidden when collapsed.

The report reflects the completed day's standings and is delivered on the
following day. It shows every candidate overall and by voter group; low-share
novelty estimates remain in a 0–2% range. Reports are private dated snapshots
and remain in the archive, including after the election. Available campaign
moves show forecasts only on the report's delivery day. A poll cannot be commissioned on the
final day because there would be no time to act on it.

The projection shows a central estimate from the expected-turnout model, not a
promise about election night. Poll-informed play performs better in the balance
harness; commissioning polls randomly without consulting their reports is
deliberately costly in money without improving decisions.

### Known tuning issue

`balanced` — spamming staged photo ops — remains particularly safe in Pendle
and Harwell. The career layer gives it a cost: it drifts credibility
down and unlocks nothing to carry forward.
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

Each action has a `category` — `constituents`, `pr`, `candidate`, `polling` or
`special` — which decides the collapsible section it appears under on the day's
menu, except polling products, which have their own auxiliary-purchase panel.
Scenario actions that omit the category are filed under `special`. The
`targeting` field is `none`, `group` or `rival`; the menu always shows one card,
and targeted actions open a separate choice before committing.

Every `special` action must also declare `special`: `track`,
`credibilityCostPct`, `failureChance`, `failureCredibilityPct`,
`dismissalChance` (conditional on detection), `failureEffects`,
`failureHeadline` and `failureFlavour`. Probabilities are 0–1; percentage costs
are 0–100. Credibility specials require positive spending without refunding it;
every probabilistic failure costs credibility; ruthless specials require positive
detection and dismissal probabilities. Contracts may set a positive
`dismissalRiskMultiplier` up to 1 (default 1). Seeded resolution occurs only on
committed moves, never previews. Success effects are not applied on failure.

Scenario `rivals.json` files declare profiles and starting group support.
Client and rival support must total 100% in every group. General gains draw
proportionally from all opponents; losses return only to main opponents.
Attacks can draw only from the selected opponent. Novelty opponents cannot
gain actual support, even through backlash. Integer election votes are
allocated with largest remainders, so the candidate totals match votes cast.

Contract objectives accept `optional`, `reward` (funds/recognition), `stat: "win"`
and `comparison: "above"` as well as the existing share/morale requirements.
Optional goals never affect sack status or the required-target recognition
baseline; their rewards are applied once when the account is kept.

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

Named events record campaign starts, moves, event responses, day advances,
incorporation, hiring, career restarts, and kept/sacked outcomes. Events contain
only fixed action-category names. Campaigns, selected actions, targets, event
choices, and company profile text are not sent.

### Base path

Project pages serve from `/<repo>`, so the deploy workflow sets `BASE_PATH`.
Locally `BASE_PATH` is unset and everything serves from `/`. To reproduce the
deployed layout:

```bash
BASE_PATH=/poc npm run build
```

Moving to a custom domain later means dropping `BASE_PATH` from the workflow.

### Android / Google Play

The Android app uses Capacitor 8 to bundle the same static game in a WebView.
It does not load the GitHub Pages site, and gameplay works offline. Its package
name is `io.github.spindoctors.poc`; this becomes permanent once published on
Play. Web, iOS and Android installations have separate saves.

#### Local development

Use Node **24.21.0** from `.nvmrc`, Android Studio **Otter 2025.2.1 or newer**,
Android SDK **36**, and **JDK 21** for Gradle. The generated project targets API
36 and supports Android 7 / API 24 or newer. A current Android System WebView
is recommended. In Android Studio, select JDK 21 as the Gradle JDK.
The client entry includes an `Array.at` polyfill for older Android WebViews.

```bash
nvm use
npm ci
export JAVA_HOME=$(/usr/libexec/java_home -v 21) # macOS terminal builds
export ANDROID_HOME="$HOME/Library/Android/sdk"
npm run android:sync
npm run android:open
```

`android:sync` always builds with an empty `BASE_PATH` before syncing web assets
and plugins into `android/`. Do not copy a `/poc` Pages build into the app.
Use `npm run android:run` to rebuild, sync and run on a connected device or
emulator. Native source and the Gradle wrapper are committed; copied web assets,
SDK paths, caches, build outputs and signing credentials are ignored.

For local artifact checks after syncing:

```bash
cd android
./gradlew :app:assembleDebug :app:bundleRelease :app:lintDebug
```

The debug APK is at `android/app/build/outputs/apk/debug/app-debug.apk`.
The release bundle is at
`android/app/build/outputs/bundle/release/app-release.aab`. **The command above
does not configure release signing; an unsigned AAB is not upload-ready.**

With an emulator/device connected, `./gradlew :app:connectedDebugAndroidTest`
checks the installed package identity, target API and disabled backup setting.
Use the `:app:` prefix to avoid running Capacitor dependencies' own example tests.

Android Back returns from game subviews to the dashboard, uses WebView history
for routes such as the privacy policy, and exits at the root. External URLs
use Capacitor's default external-browser handling; do not add remote sites to
`server.allowNavigation`. The layout uses Capacitor's safe-area inset variables
for edge-to-edge system bars. Android cloud backup and device transfer of app
data are disabled: clearing app storage or uninstalling loses the save.
Keep the WebView origin and storage keys unchanged to retain saves on updates.

#### Optional analytics and privacy

Android uses the same build-time GoatCounter configuration as the web app:

```bash
PUBLIC_GOATCOUNTER_URL=https://YOUR-SITE.goatcounter.com/count npm run android:sync
```

Unset the variable (including any local environment-file value) to disable
analytics. This is optional **for the build**, not a player opt-in. Verify the
actual release configuration before filling in Play's Data safety form.
Analytics-script failures are reported in the console, discard queued events,
and leave gameplay usable; they are not retried until a new app session.

The bundled privacy policy covers Android as well as web/iOS. Publish the
updated web policy before submission and use this public URL in Play Console:
**https://spin-doctors.github.io/poc/privacy-policy/**.
Review GoatCounter's actual data processing and any regional disclosure/consent
requirements. Cookieless analytics does not automatically mean "no data
collected". Data safety must reflect every version currently distributed under
this package, including third-party analytics. Provide a suitable developer
support email/privacy contact in the listing.

#### Manual signing and publishing

1. In `android/app/build.gradle`, set `versionName` for the release and increment
   `versionCode` for **every upload**. These native versions are separate from the
   footer's web-build version.
2. In Android Studio, use **Build → Generate Signed Bundle / APK → Android App
   Bundle**. Create/use an upload keystore outside the repository and back it
   up securely. Never commit the key or passwords.
3. Enable **Play App Signing** in Play Console and upload the release-signed AAB
   to **internal testing**. Check the target API, package, permissions, bundled
   assets and absence of a development-server URL. Recheck 64-bit/16 KB
   compatibility if future plugins introduce native `.so` libraries.
4. Create the listing as a **free game without ads or purchases**. Supply the
   title, descriptions, support email, privacy URL, **512 × 512** store icon,
   **1024 × 500** feature graphic and representative device screenshots. The
   native icon adapts the existing iOS hat/ballot branding; store graphics and
   screenshots must be prepared separately.
5. Complete app access (no login), ads (none), Data safety, target audience,
   IARC content rating and any additional Console declarations. Describe the
   political satire clearly without implying a government affiliation.
6. For personal accounts created after **November 13, 2023**, run a closed test
   with **at least 12 testers continuously opted in for at least 14 days**.
   Collect meaningful feedback and apply for production access. Completing
   that threshold does not automatically guarantee approval.
7. Resolve pre-launch report issues, select countries/device support, submit
   for review and roll out only after approval. Complete any outstanding account,
   identity/contact and physical Android-device verification.

Before upload, test the **release** on an emulator and physical Android device:
airplane-mode startup and full careers, Android Back, external links, system
bars/cutouts, gesture and three-button navigation, small screens, keyboard,
backgrounding/process termination, and save retention across a signed in-place
update. Check analytics both enabled and disabled, online and offline.
Web build success alone is not evidence of Android release readiness.

The current save store is WebView `localStorage`. Emulator testing preserved
progress after backgrounding and relaunch, but an immediate force-stop directly
after a move can lose its newest storage write before WebView flushes it to disk.
Do not treat this as crash-durable storage; evaluate native durable save storage
before a production release if that guarantee is required.

Current [Play target API rules](https://support.google.com/googleplay/android-developer/answer/11926878)
require Android 16 / API 36 for new phone apps and updates from August 31, 2026.
Recheck these and the
[personal-account testing rules](https://support.google.com/googleplay/android-developer/answer/14151465)
at submission. See also [Play App Signing](https://developer.android.com/studio/publish/app-signing)
and [Data safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469).

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
