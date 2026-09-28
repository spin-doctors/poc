<script lang="ts">
	import { onMount } from 'svelte';
	import { trackAnalyticsEvent } from '$lib/analytics';
	import { loadCareer, saveCareer, type SavedCareer } from '$lib/careerStorage';
	import CampaignView from '$lib/components/CampaignView.svelte';
	import CareerView from '$lib/components/CareerView.svelte';
	import Dashboard from '$lib/components/Dashboard.svelte';
	import ElectionNight from '$lib/components/ElectionNight.svelte';
	import { defaultScenarioId, scenarios } from '$lib/content';
	import {
		applyCareerEntry,
		playCampaignMove,
		replayCareer,
		startCareer,
		type CareerEntry,
		type CareerState
	} from '$lib/sim/career';
	import type { PlayerMove } from '$lib/sim/types';

	type View =
		| { kind: 'dashboard' }
		| { kind: 'campaign'; id: number }
		| { kind: 'career' }
		| { kind: 'result'; index: number };

	function freshSave(): SavedCareer {
		return { careerSeed: Math.floor(Math.random() * 2 ** 31), log: [] };
	}

	const initial = freshSave();
	let saved = $state<SavedCareer>(initial);
	let career = $state<CareerState>(startCareer(scenarios, defaultScenarioId, initial.careerSeed));
	let view = $state<View>({ kind: 'dashboard' });

	onMount(() => {
		const loaded = loadCareer();
		if (loaded) {
			try {
				career = replayCareer(scenarios, defaultScenarioId, loaded.careerSeed, loaded.log);
				saved = loaded;
				return;
			} catch {
				// An unreplayable save falls back to the fresh career.
			}
		}
		saveCareer(saved);
	});

	function record(entry: CareerEntry, next: CareerState) {
		career = next;
		saved = { ...saved, log: [...saved.log, entry] };
		saveCareer(saved);
	}

	function apply(entry: CareerEntry) {
		record(entry, applyCareerEntry(career, scenarios, entry));
	}

	function accept(scenarioId: string) {
		apply({ kind: 'accept', scenarioId });
		trackAnalyticsEvent('campaign-started');
		view = { kind: 'campaign', id: career.active.at(-1)!.id };
	}

	function move(campaignId: number, playerMove: PlayerMove) {
		const played = playCampaignMove(career, scenarios, campaignId, playerMove);
		record({ kind: 'move', campaignId, move: playerMove }, played.career);
		return played.result;
	}

	function tick() {
		const decided = career.history.length;
		apply({ kind: 'tick' });
		for (const outcome of career.history.slice(decided)) {
			trackAnalyticsEvent(outcome.election.sacked ? 'campaign-sacked' : 'campaign-kept');
		}
	}

	function newCareer() {
		if (!confirm('Walk away from this career and start again from nothing?')) return;
		saved = freshSave();
		career = startCareer(scenarios, defaultScenarioId, saved.careerSeed);
		saveCareer(saved);
		view = { kind: 'dashboard' };
	}

	const toDashboard = () => (view = { kind: 'dashboard' });
</script>

<main>
	<header class="masthead">
		<h1>Spin Doctors</h1>
	</header>

	{#if view.kind === 'campaign'}
		{@const id = view.id}
		{#key id}
			<CampaignView {career} campaignId={id} onMove={(m) => move(id, m)} onBack={toDashboard} />
		{/key}
	{:else if view.kind === 'career'}
		<CareerView
			{career}
			onIncorporate={(profile) => apply({ kind: 'incorporate', profile })}
			onHire={() => apply({ kind: 'hire' })}
			onNewCareer={newCareer}
			onBack={toDashboard}
		/>
	{:else if view.kind === 'result'}
		<ElectionNight outcome={career.history[view.index]} onBack={toDashboard} />
	{:else}
		<Dashboard
			{career}
			onOpen={(id) => (view = { kind: 'campaign', id })}
			onAccept={accept}
			onResult={(index) => (view = { kind: 'result', index })}
			onTick={tick}
			onCareer={() => (view = { kind: 'career' })}
		/>
	{/if}
</main>
