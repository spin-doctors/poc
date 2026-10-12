<script lang="ts">
	import { onMount } from 'svelte';
	import { App } from '@capacitor/app';
	import { Capacitor } from '@capacitor/core';
	import { version } from '$app/environment';
	import { trackAnalyticsEvent } from '$lib/analytics';
	import { setGameBackHandler } from '$lib/androidNavigation';
	import { discardLegacyCareer, loadCareer, saveCareer, type SavedCareer } from '$lib/careerStorage';
	import { advanceTesterDay, localDate, nextMidnight, reconcileCalendar } from '$lib/calendar';
	import { getNotificationPermission, requestNotificationPermission, replaceDailyReminders, onReminderTap } from '$lib/notifications';
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
			calendarDate: localDate(),
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
	let error = $state('');
	let notice = $state('');
	let notificationPermission = $state('prompt');
	let boundary = $state(nextMidnight());
	const nextDayLabel = $derived(boundary.toLocaleString('en-GB', { weekday: 'long', hour: '2-digit', minute: '2-digit' }));

	/** The core single-campaign game; the multi-account dashboard is an experimental feature. */
	const simple = $derived(!settings.experimental && isSoloCareer(career));
	const solo = $derived(career.active[0]);
	const lastOutcome = $derived(career.history.at(-1));
	const careerOver = $derived(isCareerOver(career, scenarios));

	// A new player is dropped straight into their first race.
	$effect(() => {
		if (appReady && !error && simple && !solo && !lastOutcome) takeNextClient();
	});

	let notificationWork: Promise<void> = Promise.resolve();
	$effect(() => {
		if (!appReady) return;
		scheduleReminders();
	});

	function scheduleReminders() {
		const enabled = settings.reminders && !settings.instantAdvance && career.active.length > 0;
		const remainingDays = Math.max(0, ...career.active.map((c) => scenarios[c.scenarioId].contract.days - c.state.day + 1));
		notificationWork = notificationWork.then(() => replaceDailyReminders({ enabled, remainingDays })).catch((cause) => {
			console.error('Could not update daily reminders.', cause);
			error = 'Could not update daily reminders. Check notification permissions in your device settings.';
		});
	}

	onMount(() => {
		try {
			settings = loadSettings();
			if (discardLegacyCareer()) notice = 'The unreleased game’s rules have changed. Your old career has been reset; settings are preserved.';
			const loaded = loadCareer();
			if (loaded) {
				career = replayCareer(scenarios, defaultScenarioId, loaded.careerSeed, loaded.log);
				saved = loaded;
			} else saveCareer(saved);
			syncCalendar();
		} catch (cause) {
			reportError(cause, 'Could not restore your career. Start a new career from Settings, or check device storage.');
		}
		appReady = true;
		let disposed = false;
		let timer: ReturnType<typeof setTimeout>;
		let offset = new Date().getTimezoneOffset();
		function arm() {
			boundary = nextMidnight();
			timer = setTimeout(() => {
				try { syncCalendar(); } catch (cause) { reportError(cause, 'Could not advance the calendar.'); }
				const nextOffset = new Date().getTimezoneOffset();
				if (nextOffset !== offset) { offset = nextOffset; scheduleReminders(); }
				arm();
			}, Math.max(1, Math.min(60_000, boundary.getTime() - Date.now())));
		}
		function resume() {
			clearTimeout(timer);
			try { syncCalendar(); } catch (cause) { reportError(cause, 'Could not advance the calendar. Check device storage.'); }
			scheduleReminders();
			void getNotificationPermission().then((permission) => { notificationPermission = permission; })
				.catch((cause) => reportError(cause, 'Could not read notification permissions.'));
			arm();
		}
		const visible = () => { if (document.visibilityState === 'visible') resume(); };
		document.addEventListener('visibilitychange', visible);
		window.addEventListener('focus', resume);
		arm();
		resume();
		let removeNative: (() => void) | undefined;
		let removeTap: (() => void) | undefined;
		if (Capacitor.isNativePlatform()) {
			void App.addListener('appStateChange', ({ isActive }) => { if (isActive) resume(); })
				.then((listener) => { if (disposed) void listener.remove(); else removeNative = () => void listener.remove(); })
				.catch((cause) => reportError(cause, 'Could not listen for app resume.'));
		}
		void onReminderTap(() => {
			resume();
			view = career.active.length === 1
				? { kind: 'campaign', id: career.active[0].id }
				: career.active.length === 0 && career.history.length > 0
					? { kind: 'result', index: career.history.length - 1 }
					: { kind: 'dashboard' };
		}).then((remove) => { if (disposed) remove(); else removeTap = remove; })
			.catch((cause) => reportError(cause, 'Could not handle notification taps.'));
		const removeBack = setGameBackHandler(() => {
			if (menuOpen) {
				menuOpen = false;
				return true;
			}
			if (view.kind === 'dashboard') return false;
			toDashboard();
			return true;
		});
		return () => {
			disposed = true;
			clearTimeout(timer);
			document.removeEventListener('visibilitychange', visible);
			window.removeEventListener('focus', resume);
			removeNative?.(); removeTap?.(); removeBack();
		};
	});

	function reportError(cause: unknown, fallback: string) {
		console.error(fallback, cause);
		error = cause instanceof Error ? `${fallback} ${cause.message}` : fallback;
	}

	function syncCalendar() {
		if (settings.instantAdvance) return;
		const next = reconcileCalendar(career, saved, scenarios, localDate());
		if (next.saved === saved) return;
		saveCareer(next.saved);
		saved = next.saved;
		career = next.career;
		const openCampaignId = view.kind === 'campaign' ? view.id : null;
		if (openCampaignId !== null && !career.active.some((c) => c.id === openCampaignId)) view = { kind: 'dashboard' };
		boundary = nextMidnight();
	}

	function record(entry: CareerEntry, next: CareerState) {
		const nextSave = { ...saved, log: [...saved.log, entry] };
		saveCareer(nextSave);
		saved = nextSave;
		career = next;
		error = '';
	}

	function apply(entry: CareerEntry) {
		record(entry, applyCareerEntry(career, scenarios, entry));
	}

	function accept(scenarioId: string) {
		try {
			syncCalendar();
			if (career.active.length === 0) {
				const nextSave = { ...saved, calendarDate: localDate() > saved.calendarDate ? localDate() : saved.calendarDate };
				saveCareer(nextSave);
				saved = nextSave;
			}
			apply({ kind: 'accept', scenarioId });
			trackAnalyticsEvent('campaign-started');
			if (!simple) view = { kind: 'campaign', id: career.active.at(-1)!.id };
		} catch (cause) {
			reportError(cause, 'Could not accept this client.');
		}
	}

	function takeNextClient() {
		const scenarioId = nextAssignment(career, scenarios, defaultScenarioId);
		if (scenarioId) accept(scenarioId);
	}

	/** Closes the day for the solo campaign; false once its election has been called. */
	function endSoloDay(campaignId: number) {
		if (!tick()) return true;
		return career.active.some((c) => c.id === campaignId);
	}

	function move(campaignId: number, playerMove: PlayerMove) {
		const before = career.day;
		syncCalendar();
		if (career.day !== before) throw new Error('A new day has opened. Choose your move again.');
		const played = playCampaignMove(career, scenarios, campaignId, playerMove);
		record({ kind: 'move', campaignId, move: playerMove }, played.career);
		trackAnalyticsEvent(
			playerMove.kind === 'respond' ? 'campaign-event-answered' : 'campaign-move-played'
		);
		return played.result;
	}

	function tick() {
		try {
			const decided = career.history.length;
			const openCampaignId = view.kind === 'campaign' ? view.id : null;
			const next = advanceTesterDay(career, saved, scenarios, settings.instantAdvance, localDate());
			saveCareer(next.saved);
			saved = next.saved; career = next.career;
			if (openCampaignId !== null && !career.active.some((c) => c.id === openCampaignId)) view = { kind: 'dashboard' };
			trackAnalyticsEvent('campaign-day-advanced');
			for (const outcome of career.history.slice(decided))
				trackAnalyticsEvent(outcome.election.sacked ? 'campaign-sacked' : 'campaign-kept');
			return true;
		} catch (cause) {
			reportError(cause, 'Could not advance the day.');
			return false;
		}
	}

	function incorporate(profile: CompanyProfile) {
		try {
			syncCalendar();
			apply({ kind: 'incorporate', profile });
			trackAnalyticsEvent('company-incorporated');
		} catch (cause) { reportError(cause, 'Could not incorporate the company.'); }
	}

	function hire() {
		try {
			syncCalendar();
			apply({ kind: 'hire' });
			trackAnalyticsEvent('staff-hired');
		} catch (cause) { reportError(cause, 'Could not hire staff.'); }
	}

	function newCareer() {
		if (!confirm('Walk away from this career and start again from nothing?')) return;
		restart();
	}

	function restart() {
		try {
			const nextSave = freshSave();
			saveCareer(nextSave);
			saved = nextSave;
			career = startCareer(scenarios, defaultScenarioId, saved.careerSeed);
			error = ''; notice = '';
			view = { kind: 'dashboard' };
			trackAnalyticsEvent('career-restarted');
		} catch (cause) { reportError(cause, 'Could not save a new career.'); }
	}

	async function changeSettings(next: GameSettings) {
		try {
			syncCalendar();
			if (next.reminders && !settings.reminders) {
				notificationPermission = await requestNotificationPermission();
				if (notificationPermission !== 'granted') next = { ...next, reminders: false };
			}
			if (settings.instantAdvance && !next.instantAdvance) {
				const nextSave = { ...saved, calendarDate: localDate() > saved.calendarDate ? localDate() : saved.calendarDate };
				saveCareer(nextSave);
				saved = nextSave;
			}
			saveSettings(next);
			settings = next;
		} catch (cause) { reportError(cause, 'Could not save settings.'); }
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
	{#if notice}<p role="status">{notice}</p>{/if}
	{#if error}<p role="alert" class="error">{error}</p>{/if}

	{#if !appReady}
		<p role="status">Loading your campaign...</p>
	{:else if view.kind === 'help'}
		<HelpView onBack={toDashboard} />
	{:else if view.kind === 'settings'}
		<SettingsView
			{settings}
			{notificationPermission}
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
			{#key `${id}:${career.day}`}
				<CampaignView
					{career}
					campaignId={id}
					simple
					instantAdvance={settings.instantAdvance}
					{nextDayLabel}
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
		{#key `${id}:${career.day}`}
			<CampaignView {career} campaignId={id} instantAdvance={settings.instantAdvance} {nextDayLabel} onEndDay={() => endSoloDay(id)} onMove={(m) => move(id, m)} onBack={toDashboard} />
		{/key}
	{:else if view.kind === 'career'}
		<CareerView {career} onIncorporate={incorporate} onHire={hire} onBack={toDashboard} />
	{:else if view.kind === 'result'}
		<ElectionNight outcome={career.history[view.index]} onBack={toDashboard} />
	{:else}
		<Dashboard
			{career}
			instantAdvance={settings.instantAdvance}
			{nextDayLabel}
			onOpen={(id) => (view = { kind: 'campaign', id })}
			onAccept={accept}
			onResult={(index) => (view = { kind: 'result', index })}
			onTick={tick}
		/>
	{/if}
</main>
