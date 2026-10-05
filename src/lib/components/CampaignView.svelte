<script lang="ts">
	import { untrack } from 'svelte';
	import { scenarios } from '$lib/content';
	import { formatDelta, pounds } from '$lib/format';
	import { campaignView, type CareerState } from '$lib/sim/career';
	import {
		canAfford,
		forecastAction,
		IDLE_MORALE_PENALTY,
		pollEstimate,
		unmetRequirements
	} from '$lib/sim/engine';
	import type { MoveResult, PlayerMove } from '$lib/sim/types';
	import type { ActionCategory } from '$lib/schema/content';

	const CATEGORY_ORDER: ActionCategory[] = ['constituents', 'pr', 'candidate', 'polling', 'special'];
	const CATEGORY_LABELS: Record<ActionCategory, string> = {
		constituents: 'Constituent concerns',
		pr: 'PR & media',
		candidate: 'The candidate',
		polling: 'Polling',
		special: 'Special'
	};

	interface Props {
		career: CareerState;
		campaignId: number;
		/** The single-campaign game: no dashboard, and each move is followed by ending the day. */
		simple?: boolean;
		onMove: (move: PlayerMove) => MoveResult;
		/** Ends the day; returns false once the election has been called. */
		onEndDay?: () => boolean;
		onBack: () => void;
	}

	let { career, campaignId, simple = false, onMove, onEndDay, onBack }: Props = $props();

	const campaign = $derived(career.active.find((c) => c.id === campaignId)!);
	const game = $derived(campaignView(career, campaignId));
	const active = $derived(scenarios[campaign.scenarioId]);
	const contract = $derived(active.contract);
	const groups = $derived(active.groups);
	const poll = $derived(pollEstimate(game, active));
	const commissionedPoll = $derived(
		game.pollReport?.availableOnDay === game.day ? game.pollReport : null
	);
	const pendingEvent = $derived(active.events.find((e) => e.id === game.pendingEventId) ?? null);
	const fundsLabel = $derived(career.company ? 'Company cash' : 'Your funds');

	type Stage = 'briefing' | 'day' | 'feedback' | 'event' | 'done';
	// Opening a campaign picks up wherever today left it.
	const initial = untrack(() => game);
	let stage = $state<Stage>(
		initial.pendingEventId
			? 'event'
			: initial.turnTaken
				? 'done'
				: initial.day === 1 && initial.history.length === 0
					? 'briefing'
					: 'day'
	);
	let last = $state<MoveResult | null>(null);
	// Targeted moves are listed once per voter group, so choosing the move chooses who to court.
	const menu = $derived(
		CATEGORY_ORDER.map((category) => ({
			category,
			moves: active.actions
				.filter((action) => action.category === category)
				.flatMap((action) =>
					action.targeted
						? groups.map((group) => ({ action, target: group.id as string | undefined }))
						: [{ action, target: undefined }]
				)
		})).filter((section) => section.moves.length > 0)
	);
	let openCategories = $state<Record<ActionCategory, boolean>>({
		constituents: true,
		pr: false,
		candidate: false,
		polling: false,
		special: false
	});

	const groupName = (id: string) => groups.find((g) => g.id === id)?.name ?? id;

	const firstJob = $derived(career.history.length === 0);
	const finalDay = $derived(game.day >= contract.days);

	function play(move: PlayerMove) {
		last = onMove(move);
		stage = 'feedback';
	}

	function nextDay() {
		if (!onEndDay?.()) return;
		last = null;
		stage = game.pendingEventId ? 'event' : 'day';
	}
</script>

<p class="dateline">{contract.candidateName} &middot; {contract.seat} &middot; {contract.election}</p>

{#if !simple}
	<div class="row nav">
		<button class="ghost" onclick={onBack}>&larr; Dashboard</button>
	</div>
{/if}

<section class="status">
	<div>
		<span>Day</span>
		<strong>{Math.min(game.day, contract.days)} / {contract.days}</strong>
	</div>
	<div><span>Budget</span><strong>{pounds(game.money)}</strong></div>
	{#if !simple}
		<div><span>{fundsLabel}</span><strong>{pounds(game.personalFunds)}</strong></div>
	{/if}
	<div><span>Candidate morale</span><strong>{Math.round(game.morale)}</strong></div>
	<div><span>Credibility</span><strong>{Math.round(game.credibility)}</strong></div>
	<div><span>Ruthlessness</span><strong>{Math.round(game.ruthlessness)}</strong></div>
	<div>
		<span>Poll</span>
		<strong>{poll.share}% <span class="uncertain">&plusmn;{poll.margin}</span></strong>
	</div>
</section>

{#if Object.keys(game.positions).length > 0}
	<section class="position-strip" aria-live="polite" aria-label="Candidate public positions">
		<strong>Candidate's public position</strong>
		{#each Object.entries(game.positions) as [issue, position] (issue)}
			<p><span>{issue}</span><span>{position}</span></p>
		{/each}
	</section>
{/if}

{#if stage === 'briefing'}
	<div class="card">
		{#if simple && firstJob}
			<p>
				You are a freelance spin doctor, and your phone has just rung. You are not the candidate; you
				are the one who makes the candidate look good. Hit the objectives on election night or you
				are out of a job.
			</p>
		{/if}
		<h2>Your new client</h2>
		<h3>{contract.candidateName}</h3>
		<p>{contract.candidateBlurb}</p>
		<h3>The contract</h3>
		<ul class="objectives">
			{#each contract.objectives as objective (objective.id)}
				<li>{objective.label}</li>
			{/each}
			<li>Budget: {pounds(contract.budget)} over {contract.days} days</li>
			{#if !simple}
				<li>Your fee if you keep the account: {pounds(contract.fee)}</li>
			{/if}
		</ul>
		{#if simple}
			<p class="hint">Miss any objective and you are out of a job. You get one move a day.</p>
			<p class="hint">
				Some moves are locked. Your credibility and your reputation for ruthlessness decide which
				ones open up — and they follow you from client to client.
			</p>
		{:else}
			<p class="hint">
				Miss any objective and you are out of a job. You get one move a day on each account; a day
				you leave idle costs the candidate {IDLE_MORALE_PENALTY} morale.
			</p>
			<p class="hint">
				Some moves are locked. Your credibility and your reputation for ruthlessness decide which
				ones open up — and they are shared across every account you run.
			</p>
		{/if}
		<button onclick={() => (stage = 'day')}>Plan today's move</button>
	</div>

	<div class="card">
		<h3>The electorate</h3>
		{#each groups as group (group.id)}
			<p><strong>{group.name}</strong> — {group.blurb}</p>
		{/each}
	</div>
{/if}

{#if stage === 'day'}
	<h2>Day {game.day}</h2>
	<div class="actions">
		{#if commissionedPoll}
			<p class="poll-note">
				Commissioned poll: projected vote share if you take each move. The reported margin is
				&plusmn;{commissionedPoll.margin} points.
			</p>
		{/if}
		{#each menu as section (section.category)}
			<details class="category" bind:open={openCategories[section.category]}>
				<summary>{CATEGORY_LABELS[section.category]} <span>({section.moves.length})</span></summary>
				{#each section.moves as { action, target }, i (`${action.id}:${target ?? ''}`)}
					{@const locks = unmetRequirements(game, action)}
					{@const forecast = forecastAction(game, active, action, target)}
					{@const tooLate = Boolean(action.pollMargin) && game.day >= contract.days}
					<button
						class="action"
						class:locked={locks.length > 0}
						disabled={!canAfford(game, action) || locks.length > 0 || tooLate}
						onclick={() => play({ kind: 'action', actionId: action.id, target })}
					>
						<span>
							<strong>{action.name}{target ? ` — ${groupName(target)}` : ''}</strong>
							{#if section.moves[i - 1]?.action !== action}
								<em>{action.description}</em>
							{/if}
							{#if forecast}
								<em class="forecast">Projected vote share: {forecast.share}% &plusmn;{forecast.margin}</em>
							{/if}
							{#if tooLate}
								<em class="lock">No campaign day remains to use the results</em>
							{/if}
							{#each locks as lock (lock.stat)}
								<em class="lock">🔒 {lock.label}</em>
							{/each}
						</span>
						<span class="cost">{action.cost === 0 ? 'Free' : pounds(action.cost)}</span>
					</button>
				{/each}
			</details>
		{/each}
	</div>
{/if}

{#if stage === 'feedback' && last}
	<p class="flavour">{last.flavour}</p>

	{#if last.feedback.length > 0}
		<ul class="feedback">
			{#each last.feedback as line, i (i)}
				<li>
					<span>
						{line.label}
						{#if !line.certain}<span class="uncertain">— you won't know until election night</span>{/if}
					</span>
					<span class="delta {line.delta > 0 ? 'up' : 'down'}">{formatDelta(line)}</span>
				</li>
			{/each}
		</ul>
	{:else if last.pollCommissioned}
		<p class="hint">No voter movement today. The poll results arrive tomorrow.</p>
	{:else if !last.triggeredEventId}
		<p class="hint">No measurable effect. It happens.</p>
	{/if}

	{#if last.gaffe}
		<div class="card">
			<div class="headline">{last.gaffe.headline}</div>
			<p>Your candidate went off-script. You were not in the room.</p>
			<ul class="feedback">
				{#each last.gaffe.feedback as line, i (i)}
					<li>
						<span>{line.label}</span>
						<span class="delta {line.delta > 0 ? 'up' : 'down'}">{formatDelta(line)}</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if pendingEvent}
		<button onclick={() => (stage = 'event')}>Continue</button>
	{:else if simple}
		{@render endDayButton()}
	{:else}
		<button onclick={onBack}>Back to dashboard</button>
	{/if}
{/if}

{#if stage === 'event' && pendingEvent}
	<section
		class="story-event"
		class:corrupted-feed={pendingEvent.presentation === 'corrupted-feed'}
		aria-live="polite"
	>
		{#if pendingEvent.presentation === 'corrupted-feed'}
			<div class="feed-glitch" aria-label="Simulated service interruption">
				<span>FEED ERROR 0x00C10UD</span>
				<span>RETRYING LOCAL COPY // SOURCE DATA INCONSISTENT</span>
			</div>
		{/if}
		<div class="headline">{pendingEvent.headline}</div>
		<p>{pendingEvent.body}</p>
		<div class="actions">
			{#each pendingEvent.responses as response, i (response.label)}
				<button
					class="action"
					onclick={() => play({ kind: 'respond', eventId: pendingEvent.id, responseIndex: i })}
				>
					<span>
						<strong>{response.label}</strong>
						{#if response.hint}<em>{response.hint}</em>{/if}
					</span>
				</button>
			{/each}
		</div>
	</section>
{/if}

{#if stage === 'done'}
	<div class="card">
		<h3>Done for today</h3>
		{#if simple}
			<p>Today's move is in.</p>
			{@render endDayButton()}
		{:else}
			<p>Today's move on this account is in. Come back once the day has passed.</p>
			<button onclick={onBack}>Back to dashboard</button>
		{/if}
	</div>
{/if}

{#snippet endDayButton()}
	<button onclick={nextDay}>
		{finalDay ? 'Polls close — go to the count' : `On to day ${game.day + 1}`}
	</button>
{/snippet}
