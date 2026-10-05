<script lang="ts">
	import { onMount } from 'svelte';
	import { version } from '$app/environment';
	import { trackAnalyticsEvent } from '$lib/analytics';
	import { setGameBackHandler } from '$lib/androidNavigation';
	import { loadCareer, saveCareer, type SavedCareer } from '$lib/careerStorage';
	import CampaignView from '$lib/components/CampaignView.svelte';
	import CareerView from '$lib/components/CareerView.svelte';
	import Dashboard from '$lib/components/Dashboard.svelte';
	import ElectionNight from '$lib/components/ElectionNight.svelte';
	import HelpView from '$lib/components/HelpView.svelte';
	import Menu, { type MenuDestination } from '$lib/components/Menu.svelte';
	import SettingsView from '$lib/components/SettingsView.svelte';
	import { defaultScenarioId, epilogues, scenarios } from '$lib/content';
	import {
		applyCareerEntry,
		careerEpilogue,
		isCareerOver,
		isSoloCareer,
		nextAssignment,
		playCampaignMove,
		replayCareer,
		startCareer,
		type CareerEntry,
		type CareerState,
		type CompanyProfile
	} from '$lib/sim/career';
	import { defaultSettings, loadSettings, saveSettings, type GameSettings } from '$lib/settings';
	import type { PlayerMove } from '$lib/sim/types';

	type View =
		| { kind: 'dashboard' }
		| { kind: 'campaign'; id: number }
		| { kind: 'career' }
		| { kind: 'help' }
		| { kind: 'settings' }
		| { kind: 'result'; index: number };

	function freshSave(): SavedCareer {
		return {
			careerSeed: Math.floor(Math.random() * 2 ** 31),
			log: [],
			startedVersion: version
		};
	}

	const initial = freshSave();
	let saved = $state<SavedCareer>(initial);
	let career = $state<CareerState>(startCareer(scenarios, defaultScenarioId, initial.careerSeed));
	let view = $state<View>({ kind: 'dashboard' });
	let appReady = $state(false);
	let settings = $state<GameSettings>(defaultSettings);
	let menuOpen = $state(false);

	/** The core single-campaign game; the multi-account dashboard is an experimental feature. */
	const simple = $derived(!settings.experimental && isSoloCareer(career));
	const solo = $derived(career.active[0]);
	const lastOutcome = $derived(career.history.at(-1));
	const careerOver = $derived(isCareerOver(career, scenarios));

	// A new player is dropped straight into their first race.
	$effect(() => {
		if (appReady && simple && !solo && !lastOutcome) takeNextClient();
	});

	onMount(() => {
		const loaded = loadCareer();
		let restored = false;
		if (loaded) {
			try {
				career = replayCareer(scenarios, defaultScenarioId, loaded.careerSeed, loaded.log);
				saved = loaded;
				restored = true;
			} catch {
				// An unreplayable save falls back to the fresh career.
			}
		}
		if (!restored) saveCareer(saved);
		settings = loadSettings();
		appReady = true;
		return setGameBackHandler(() => {
			if (menuOpen) {
				menuOpen = false;
				return true;
			}
			if (view.kind === 'dashboard') return false;
			toDashboard();
			return true;
		});
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
		if (!simple) view = { kind: 'campaign', id: career.active.at(-1)!.id };
	}

	function takeNextClient() {
		const scenarioId = nextAssignment(career, scenarios, defaultScenarioId);
		if (scenarioId) accept(scenarioId);
	}

	/** Closes the day for the solo campaign; false once its election has been called. */
	function endSoloDay(campaignId: number) {
		tick();
		return career.active.some((c) => c.id === campaignId);
	}

	function move(campaignId: number, playerMove: PlayerMove) {
		const played = playCampaignMove(career, scenarios, campaignId, playerMove);
		record({ kind: 'move', campaignId, move: playerMove }, played.career);
		trackAnalyticsEvent(
			playerMove.kind === 'respond' ? 'campaign-event-answered' : 'campaign-move-played'
		);
		return played.result;
	}

	function tick() {
		const decided = career.history.length;
		apply({ kind: 'tick' });
		trackAnalyticsEvent('campaign-day-advanced');
		for (const outcome of career.history.slice(decided)) {
			trackAnalyticsEvent(outcome.election.sacked ? 'campaign-sacked' : 'campaign-kept');
		}
	}

	function incorporate(profile: CompanyProfile) {
		apply({ kind: 'incorporate', profile });
		trackAnalyticsEvent('company-incorporated');
	}

	function hire() {
		apply({ kind: 'hire' });
		trackAnalyticsEvent('staff-hired');
	}

	function newCareer() {
		if (!confirm('Walk away from this career and start again from nothing?')) return;
		restart();
	}

	function restart() {
		saved = freshSave();
		career = startCareer(scenarios, defaultScenarioId, saved.careerSeed);
		saveCareer(saved);
		view = { kind: 'dashboard' };
		trackAnalyticsEvent('career-restarted');
	}

	function changeSettings(next: GameSettings) {
		settings = next;
		saveSettings(next);
	}

	function openFromMenu(destination: MenuDestination) {
		view = { kind: destination };
	}

	const toDashboard = () => (view = { kind: 'dashboard' });
</script>

<main>
	<header class="masthead masthead-bar">
		<h1>Spin Doctors</h1>
		{#if appReady}
			<Menu bind:open={menuOpen} showCareer={!simple} onSelect={openFromMenu} />
		{/if}
	</header>

	{#if !appReady}
		<p role="status">Loading your campaign...</p>
	{:else if view.kind === 'help'}
		<HelpView onBack={toDashboard} />
	{:else if view.kind === 'settings'}
		<SettingsView
			{settings}
			soloCareer={isSoloCareer(career)}
			onChange={changeSettings}
			onNewCareer={newCareer}
			onBack={toDashboard}
		/>
	{:else if careerOver && lastOutcome}
		<ElectionNight
			outcome={lastOutcome}
			{simple}
			epilogue={careerEpilogue(career, epilogues)}
			onRestart={restart}
			onBack={toDashboard}
		/>
	{:else if simple}
		{#if solo}
			{@const id = solo.id}
			{#key id}
				<CampaignView
					{career}
					campaignId={id}
					simple
					onMove={(m) => move(id, m)}
					onEndDay={() => endSoloDay(id)}
					onBack={toDashboard}
				/>
			{/key}
		{:else if lastOutcome}
			<ElectionNight outcome={lastOutcome} simple onNext={takeNextClient} onBack={toDashboard} />
		{:else}
			<p role="status">Your phone is ringing...</p>
		{/if}
	{:else if view.kind === 'campaign'}
		{@const id = view.id}
		{#key id}
			<CampaignView {career} campaignId={id} onMove={(m) => move(id, m)} onBack={toDashboard} />
		{/key}
	{:else if view.kind === 'career'}
		<CareerView {career} onIncorporate={incorporate} onHire={hire} onBack={toDashboard} />
	{:else if view.kind === 'result'}
		<ElectionNight outcome={career.history[view.index]} onBack={toDashboard} />
	{:else}
		<Dashboard
			{career}
			onOpen={(id) => (view = { kind: 'campaign', id })}
			onAccept={accept}
			onResult={(index) => (view = { kind: 'result', index })}
			onTick={tick}
		/>
	{/if}
</main>
