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

A career of campaigns, run from a dashboard. Each campaign is a week or so, one
move per day on each account, then an election; the offers board shows whoever
is calling. Days pass for every account at once — the prototype has a
**Simulate next day** button standing in for the real calendar — and each
election is called when its final day ends. An account left without a move for
the day loses the day and some candidate morale.

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

Your credibility, ruthlessness and funds are one shared pool across every
account you run, so a clean day at Ashcombe can open the Inside Track in
another campaign. Keeping an account pays the contract's **fee** into
your personal funds and earns **recognition**: a base amount per contract, plus one for every point you
beat the vote-share target by (up to ten). Being sacked pays
nothing, costs recognition, and the only phone that rings is the contract's
`fallback` — a worse candidate.

| Scenario                          | Tier          | Days | Fee     | Who will hire you                         |
| --------------------------------- | ------------- | ---- | ------- | ----------------------------------------- |
| Ashcombe South (Bramley)          | council       | 7    | £12,000 | anyone; where every career starts         |
| Pendle Hurst West (Malcolm)       | council       | 7    | £4,000  | recognition 15 or below                   |
| Harwell and Stoke Minster (Priya) | parliamentary | 10   | £30,000 | recognition 12+, ruthlessness 70 or below |

Locked offers stay visible with their requirements, like locked moves. Alone
you can run one account at a time; incorporate a company (an experimental
feature: turn it on in **Settings** from the ☰ menu), then hire staff
(a one-off fee plus a daily wage from company cash) to run one more account
per staffer, never the same seat twice at once. The career is saved in
`localStorage` as the career seed plus an ordered log of accepts, moves, day
ticks, incorporation and hires, and rebuilt by replay on load. Saves from
before the dashboard are discarded.

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

## 📱 iOS shell

The Capacitor iOS shell bundles the static SvelteKit build in a native WebView.
The app can launch without a network connection, though online services such as
analytics will be unavailable. Saves stay in the iOS app's WebView storage and
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

Make one move each day. Canvass, court the media, prepare the candidate, commission a poll or go on the attack. Every choice shifts voter support and your own credibility, ruthlessness and funds.

Polls show what might happen, not what will. Scandals branch, turnout is uncertain, and a candidate can go off-script. At election night, find out whether your strategy was enough.

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
