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

	interface Props {
		career: CareerState;
		campaignId: number;
		onMove: (move: PlayerMove) => MoveResult;
		onBack: () => void;
	}

	let { career, campaignId, onMove, onBack }: Props = $props();

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
	let target = $state(untrack(() => groups[0].id));

	const groupName = (id: string) => groups.find((g) => g.id === id)?.name ?? id;

	function play(move: PlayerMove) {
		last = onMove(move);
		stage = 'feedback';
	}
</script>

<p class="dateline">{contract.candidateName} &middot; {contract.seat} &middot; {contract.election}</p>

<div class="row nav">
	<button class="ghost" onclick={onBack}>&larr; Dashboard</button>
</div>

<section class="status">
	<div>
		<span>Day</span>
		<strong>{Math.min(game.day, contract.days)} / {contract.days}</strong>
	</div>
	<div><span>Budget</span><strong>{pounds(game.money)}</strong></div>
	<div><span>{fundsLabel}</span><strong>{pounds(game.personalFunds)}</strong></div>
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
		<h2>Your new client</h2>
		<h3>{contract.candidateName}</h3>
		<p>{contract.candidateBlurb}</p>
		<h3>The contract</h3>
		<ul class="objectives">
			{#each contract.objectives as objective (objective.id)}
				<li>{objective.label}</li>
			{/each}
			<li>Budget: {pounds(contract.budget)} over {contract.days} days</li>
			<li>Your fee if you keep the account: {pounds(contract.fee)}</li>
		</ul>
		<p class="hint">
			Miss any objective and you are out of a job. You get one move a day on each account; a day
			you leave idle costs the candidate {IDLE_MORALE_PENALTY} morale.
		</p>
		<p class="hint">
			Some moves are locked. Your credibility and your reputation for ruthlessness decide which
			ones open up — and they are shared across every account you run.
		</p>
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
	<fieldset>
		<legend>Who are you courting today?</legend>
		<div class="targets">
			{#each groups as group (group.id)}
				<label>
					<input type="radio" name="target" value={group.id} bind:group={target} />
					{group.name}
				</label>
			{/each}
		</div>
		<p class="hint">Only applies to targeted moves.</p>
	</fieldset>

	<div class="actions">
		{#if commissionedPoll}
			<p class="poll-note">
				Commissioned poll: projected vote share if you take each move. The reported margin is
				&plusmn;{commissionedPoll.margin} points.
			</p>
		{/if}
		{#each active.actions as action (action.id)}
			{@const locks = unmetRequirements(game, action)}
			{@const forecast = forecastAction(game, active, action, action.targeted ? target : undefined)}
			{@const tooLate = Boolean(action.pollMargin) && game.day >= contract.days}
			<button
				class="action"
				class:locked={locks.length > 0}
				disabled={!canAfford(game, action) || locks.length > 0 || tooLate}
				onclick={() =>
					play({
						kind: 'action',
						actionId: action.id,
						target: action.targeted ? target : undefined
					})}
			>
				<span>
					<strong>{action.name}{action.targeted ? ` → ${groupName(target)}` : ''}</strong>
					<em>{action.description}</em>
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
		<p>Today's move on this account is in. Come back once the day has passed.</p>
		<button onclick={onBack}>Back to dashboard</button>
	</div>
{/if}
