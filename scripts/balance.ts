/**
 * Headless balance harness. Plays N campaigns with naive strategies and reports the
 * sack rate. Target for a first playthrough is roughly 1 in 4 — frequent enough to
 * feel real, rare enough that gambling is still worth it.
 *
 *   npm run balance -- 10000
 */
import { content } from '../src/lib/content/index.js';
import {
	applyMove,
	canAfford,
	createGame,
	runElection
} from '../src/lib/sim/engine.js';
import { nextRandom } from '../src/lib/sim/rng.js';
import type { GameState, PlayerMove } from '../src/lib/sim/types.js';

const runs = Number(process.argv[2] ?? 5000);

type Strategy = (state: GameState, pick: number) => PlayerMove;

const groupIds = content.groups.map((g) => g.id);

const strategies: Record<string, Strategy> = {
	random: (state, pick) => {
		const affordable = content.actions.filter((a) => canAfford(state, a));
		const action = affordable[Math.floor(pick * affordable.length)] ?? content.actions[0];
		return {
			kind: 'action',
			actionId: action.id,
			target: action.targeted ? groupIds[Math.floor(pick * groupIds.length)] : undefined
		};
	},
	allAttack: (state, pick) => ({
		kind: 'action',
		actionId: canAfford(state, content.actions.find((a) => a.id === 'attackAd')!)
			? 'attackAd'
			: 'doorstep',
		target: groupIds[Math.floor(pick * groupIds.length)]
	}),
	allDoorstep: () => ({ kind: 'action', actionId: 'doorstep', target: 'commuters' }),
	balanced: (state, pick) => {
		if (state.morale < 40) return { kind: 'action', actionId: 'debatePrep' };
		const action = content.actions.find((a) => a.id === 'photoOp')!;
		if (!canAfford(state, action)) return { kind: 'action', actionId: 'doorstep', target: 'retirees' };
		return {
			kind: 'action',
			actionId: 'photoOp',
			target: groupIds[Math.floor(pick * groupIds.length)]
		};
	}
};

function playOne(strategy: Strategy, seed: number) {
	let state = createGame(content, seed);
	let rng = seed ^ 0x9e3779b9;

	while (!state.finished) {
		const roll = nextRandom(rng);
		rng = roll.state;

		let move: PlayerMove;
		if (state.pendingEventId) {
			const pending = content.events.find((e) => e.id === state.pendingEventId)!;
			move = {
				kind: 'respond',
				eventId: pending.id,
				responseIndex: Math.floor(roll.value * pending.responses.length)
			};
		} else {
			move = strategy(state, roll.value);
		}

		try {
			state = applyMove(state, content, move).state;
		} catch {
			state = applyMove(state, content, {
				kind: 'action',
				actionId: 'doorstep',
				target: 'commuters'
			}).state;
		}
	}
	return runElection(state, content);
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

console.log(`\nSpin Doctors — balance report (${runs} campaigns per strategy)\n`);
console.log(
	['strategy', 'sacked', 'mean share', 'p10', 'p25', 'p90', 'mean morale'].join('\t')
);

for (const [name, strategy] of Object.entries(strategies)) {
	const shares: number[] = [];
	let sacked = 0;
	let moraleTotal = 0;

	for (let i = 0; i < runs; i++) {
		const result = playOne(strategy, i * 7919 + 13);
		shares.push(result.voteShare);
		moraleTotal += result.morale;
		if (result.sacked) sacked++;
	}

	shares.sort((a, b) => a - b);
	const mean = shares.reduce((a, b) => a + b, 0) / shares.length;
	console.log(
		[
			name.padEnd(12),
			pct(sacked / runs),
			mean.toFixed(1),
			shares[Math.floor(runs * 0.1)].toFixed(1),
			shares[Math.floor(runs * 0.25)].toFixed(1),
			shares[Math.floor(runs * 0.9)].toFixed(1),
			(moraleTotal / runs).toFixed(1)
		].join('\t')
	);
}

console.log(
	`\nTarget sack rate for naive play (random): 20-30%. Skilled play should beat it clearly.\n`
);
