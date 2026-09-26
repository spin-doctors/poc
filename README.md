# Spin Doctor 🎩🗳️

**Spin Doctor** is a political campaign management game with a satirical twist.

Instead of managing a football team, you manage the career of a political candidate — spinning scandals, staging photo ops, and navigating the murky world of public opinion. Start with local elections and climb the greasy pole to national dominance... if you can keep your candidate out of jail (or at least out of memes).

## 🎮 Gameplay Overview

- 🗓️ Weekly elections: No skipping, no fast forward — every decision counts.
- 🎭 Daily campaign activities: Prep speeches, visit schools, launch distractions.
- 🔥 Scandals and events: Deal with crises, react to news cycles, manage damage.
- 📊 Voter groups: Each with values, moods, and susceptibility to spin.
- 💰 Resources: Spend on focus groups, PR stunts, media buys — or hush money.
- 🧠 Satirical AI logic: Voter behavior shaped by personality-driven traits.
- 🧑‍🤝‍🧑 Multiplayer mode (planned): Compete with other players in head-to-head elections.

## 🛠️ Technical Stack

This game is being built as a **Progressive Web App** with a modular backend using **OpenAPI**, to allow flexibility and maintainability across different platforms.

### Tech Outline

- **Frontend**: React (or SvelteKit), deployed as PWA
- **Backend**: Node.js with OpenAPI, using Fastify or Express
- **Data**: JSON-based or SQLite for early prototyping
- **Sim Engine**: Custom logic to simulate elections, scandals, and voter response

## 🚧 Project Status

Currently in **pre-alpha prototyping**. First milestone: a working single-player weekly election loop.

## 📁 Structure (Planned)

```text
/frontend       # UI & game loop
/backend        # API & game state
/sim            # Election & voter logic
/data           # JSON voter groups, events, actions
```

## 📌 Goals

- [ ] Define core game loop and daily/election mechanics
- [ ] Build first vertical slice (1-week campaign → result)
- [ ] Integrate voter simulation engine
- [ ] Expand content/events system
- [ ] Launch closed alpha

## 🤔 Why "Spin Doctor"?

Because in politics, **truth is optional — but optics are everything.**

## 🧠 Inspiration

Inspired by games like:

- Premier Manager
- Football Manager
- Papers, Please
- Democracy 3
- Not For Broadcast

## 📜 License

[MIT](LICENSE)