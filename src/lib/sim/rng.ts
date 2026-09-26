/** Pure seeded PRNG. Every draw returns the next state, so nothing is hidden in a closure. */
export interface Roll {
	value: number;
	state: number;
}

export function nextRandom(state: number): Roll {
	let a = (state + 0x6d2b79f5) | 0;
	let t = Math.imul(a ^ (a >>> 15), 1 | a);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, state: a };
}

export function randomRange(state: number, min: number, max: number): Roll {
	const roll = nextRandom(state);
	return { value: min + roll.value * (max - min), state: roll.state };
}

export function seedFromString(text: string): number {
	let h = 2166136261;
	for (let i = 0; i < text.length; i++) {
		h ^= text.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}
