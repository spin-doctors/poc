<script lang="ts">
	import { untrack } from 'svelte';
	import { t } from '$lib/i18n';
	import { scenarios } from '$lib/content';
	import PollReportView from './PollReportView.svelte';
	import { formatDelta, pounds } from '$lib/format';
	import { campaignView, type CareerState } from '$lib/sim/career';
	import {
		canAfford,
		forecastAction,
		IDLE_MORALE_PENALTY,
		pollEstimate,
		publicPoll,
		unmetRequirements
	} from '$lib/sim/engine';
	import type { MoveResult, PlayerMove } from '$lib/sim/types';
	import type { ActionCategory, GameAction } from '$lib/schema/content';
	import { SPECIAL_LABELS, SPECIAL_TRACKS, specialPreview, visibleSpecialActions } from '$lib/sim/specialActions';

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
		instantAdvance?: boolean;
		nextDayLabel: string;
		onMove: (move: PlayerMove) => MoveResult;
		/** Ends the day; returns false once the election has been called. */
		onEndDay?: () => boolean;
		onBack: () => void;
	}

	let { career, campaignId, simple = false, instantAdvance = false, nextDayLabel, onMove, onEndDay, onBack }: Props = $props();

	const campaign = $derived(career.active.find((c) => c.id === campaignId)!);
	const game = $derived(campaignView(career, campaignId));
	const active = $derived(scenarios[campaign.scenarioId]);
	const contract = $derived(active.contract);
	const groups = $derived(active.groups);
	const poll = $derived(pollEstimate(game, active));
	const publicReport = $derived(publicPoll(game, active));
	const latestReport = $derived(game.reports.at(-1));
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
	let selection = $state<GameAction | null>(null);
	let confirmation = $state<{ action: GameAction; target?: string } | null>(null);
	let pollMessage = $state('');
	let error = $state('');
	const menu = $derived(
		CATEGORY_ORDER.flatMap<{ id: string; label: string; moves: GameAction[] }>((category) => category === 'special'
			? SPECIAL_TRACKS.map((track) => ({
				id: track, label: $t('Special: {track}', { track: $t(SPECIAL_LABELS[track]) }),
				moves: visibleSpecialActions(game, active.actions.filter((a) => a.special?.track === track))
			}))
			: [{ id: category, label: CATEGORY_LABELS[category],
				moves: active.actions.filter((action) => action.category === category && !action.pollMargin) }]
		).filter((section) => section.moves.length > 0)
	);
	let openCategories = $state<Record<string, boolean>>({
		constituents: true,
		pr: false,
		candidate: false,
		polling: false,
		credibility: false, ruthlessness: false, personalFunds: false
	});

	const firstJob = $derived(career.history.length === 0);
	const finalDay = $derived(game.day >= contract.days);
	const risk = $derived(confirmation ? specialPreview(game, active, confirmation.action) : null);

	function choose(action: GameAction, target?: string) {
		if (action.special) {
			confirmation = { action, target };
			selection = null;
		} else play({ kind: 'action', actionId: action.id, target });
	}

	function play(move: PlayerMove) {
		try {
			const result = onMove(move);
			error = '';
			if (move.kind === 'poll') {
				pollMessage = $t('Poll commissioned. Your private report arrives tomorrow; today’s campaign move is still separate.');
			} else {
				last = result;
				selection = null;
				confirmation = null;
				stage = 'feedback';
			}
		} catch (cause) {
			console.error('Could not play campaign move.', cause);
			error = cause instanceof Error ? $t(cause.message) : $t('Could not play this move.');
		}
	}

	function nextDay() {
		onEndDay?.();
	}
</script>

<p class="dateline">{contract.candidateName} &middot; {$t(contract.seat)} &middot; {$t(contract.election)}</p>
{#if error}<p role="alert" class="error">{error}</p>{/if}

{#if !simple}
	<div class="row nav">
		<button class="ghost" onclick={onBack}>&larr; {$t('Dashboard')}</button>
	</div>
{/if}

<section class="status">
	<div>
		<span>{$t('Day')}</span>
		<strong>{Math.min(game.day, contract.days)} / {contract.days}</strong>
	</div>
	<div><span>{$t('Budget')}</span><strong>{pounds(game.money)}</strong></div>
	{#if !simple}
		<div><span>{$t(fundsLabel)}</span><strong>{pounds(game.personalFunds)}</strong></div>
	{/if}
	<div><span>{$t('Candidate morale')}</span><strong>{Math.round(game.morale)}</strong></div>
	<div><span>{$t('Credibility')}</span><strong>{game.credibility.toFixed(1)}</strong></div>
	<div><span>{$t('Ruthlessness')}</span><strong>{game.ruthlessness.toFixed(1)}</strong></div>
	<div>
		<span>{$t('Poll')}</span>
		<strong>{poll.share}% <span class="uncertain">&plusmn;{poll.margin}</span></strong>
	</div>
</section>

{#if Object.keys(game.positions).length > 0}
	<section class="position-strip" aria-live="polite" aria-label={$t('Candidate public positions')}>
		<strong>{$t("Candidate's public position")}</strong>
		{#each Object.entries(game.positions) as [issue, position] (issue)}
			<p><span>{issue}</span><span>{position}</span></p>
		{/each}
	</section>
{/if}

{#if stage === 'briefing'}
	<div class="card">
		{#if simple && firstJob}
			<p>
				{$t('You are a freelance spin doctor, and your phone has just rung. You are not the candidate; you are the one who makes the candidate look good. Hit the objectives on election night or you are out of a job.')}
			</p>
		{/if}
		<h2>{$t('Your new client')}</h2>
		<h3>{contract.candidateName}</h3>
		<p>{$t(contract.candidateBlurb)}</p>
		<h3>{$t('The contract')}</h3>
		<ul class="objectives">
			{#each contract.objectives.filter((o) => !o.optional) as objective (objective.id)}
				<li>{$t(objective.label)}</li>
			{/each}
			<li>{$t('Budget: {budget} over {days} days', { budget: pounds(contract.budget), days: contract.days })}</li>
			{#if !simple}
				<li>{$t('Your fee if you keep the account: {fee}', { fee: pounds(contract.fee) })}</li>
			{/if}
		</ul>
		<h3>{$t('Optional bonuses')}</h3>
		<ul class="objectives">
			{#each contract.objectives.filter((o) => o.optional) as objective (objective.id)}
				<li>{$t(objective.label)}: {pounds(objective.reward?.funds ?? 0)} {$t('and')} {objective.reward?.recognition ?? 0} {$t('recognition')}</li>
			{/each}
		</ul>
		<p class="hint">{$t('Bonuses are paid only if you keep the account. A first-past-the-post win means beating every opponent, not necessarily reaching 50%.')}</p>
		{#if simple}
			<p class="hint">{$t('Miss any required objective and you are out of a job. You get one move a day, plus one optional paid poll.')}</p>
			<p class="hint">
				{$t('Some moves are locked. Your credibility and your reputation for ruthlessness decide which ones open up — and they follow you from client to client.')}
			</p>
		{:else}
			<p class="hint">{$t('Miss any required objective and you are out of a job. You get one move and an optional poll each day on each account; a day you leave idle costs the candidate {penalty} morale.', { penalty: IDLE_MORALE_PENALTY })}</p>
			<p class="hint">
				{$t('Some moves are locked. Your credibility and your reputation for ruthlessness decide which ones open up — and they are shared across every account you run.')}
			</p>
		{/if}
		<button onclick={() => (stage = 'day')}>{$t("Plan today's move")}</button>
	</div>

	<div class="card">
		<h3>{$t('The electorate')}</h3>
		{#each groups as group (group.id)}
			<p><strong>{$t(group.name)}</strong> — {$t(group.blurb)}</p>
		{/each}
	</div>
{/if}

{#if stage === 'day' && !selection && !confirmation}
	<h2>{$t('Day {day}', { day: game.day })}</h2>
	<div class="actions">
		{#if commissionedPoll}
			<p class="poll-note">
				{$t('Commissioned poll: projected vote share if you take each move. The reported margin is ±{margin} points.', { margin: commissionedPoll.margin })}
			</p>
		{/if}
		{#each menu as section (section.id)}
			<details class="category" bind:open={openCategories[section.id]}>
				<summary>{$t(section.label)} <span>({section.moves.length})</span></summary>
				{#each section.moves as action (action.id)}
					{@const locks = unmetRequirements(game, action)}
					{@const forecast = action.targeting === 'none' ? forecastAction(game, active, action) : null}
					<button
						class="action"
						class:locked={locks.length > 0}
						disabled={!canAfford(game, action) || locks.length > 0}
						onclick={() => action.targeting === 'none' ? choose(action) : (selection = action)}
					>
						<span>
							<strong>{$t(action.name)}</strong>
								<em>{$t(action.description)}</em>
							{#if forecast}
								<em class="forecast">{$t('Projected vote share: {share}% ±{margin}', { share: forecast.share, margin: forecast.margin })}</em>
							{/if}
							{#each locks as lock (lock.stat)}
								<em class="lock">🔒 {$t(lock.label)}</em>
							{/each}
						</span>
						<span class="cost">{action.cost === 0 ? $t('Free') : pounds(action.cost)}</span>
					</button>
				{/each}
			</details>
		{/each}
	</div>
{/if}

{#if stage === 'day' && selection}
	<h2>{$t(selection.name)}</h2>
	<button class="ghost" onclick={() => (selection = null)}>&larr; {$t('Back to actions')}</button>
	<p>{$t(selection.targeting === 'group' ? 'Choose who to visit.' : 'Choose which opponent to target.')}
		{$t(selection.special ? 'You will review the risks before committing.' : 'This choice commits today’s move.')}</p>
	<div class="actions">
		{#each (selection.targeting === 'group' ? groups : active.rivals) as target (target.id)}
			{@const forecast = forecastAction(game, active, selection, target.id)}
			<button class="action" disabled={!canAfford(game, selection) || unmetRequirements(game, selection).length > 0}
				onclick={() => selection && choose(selection, target.id)}>
				<span><strong>{$t(target.name)}{'novelty' in target && target.novelty ? ` — ${$t('novelty contender')}` : ''}</strong>
					<em>{$t(target.blurb)}</em>
					{#if 'novelty' in target && target.novelty}<em>{$t('Very few votes available to win over.')}</em>{/if}
					{#if selection.targeting === 'rival'}
						{@const standing = (latestReport ?? publicReport).standings.find((c) => c.id === target.id)}
						{#if standing}
							<em>{latestReport ? $t('Private poll, day {day}', { day: latestReport.availableOnDay }) : $t('Public poll')}:
								{standing.share.toFixed(1)}% {latestReport && latestReport.availableOnDay < game.day ? `(${$t('historical')})` : ''}</em>
						{/if}
						{#if latestReport}
							{#each latestReport.groups as group (group.groupId)}
								{@const estimate = group.standings.find((c) => c.id === target.id)}
								{#if estimate}								<em>{$t(groups.find((g) => g.id === group.groupId)?.name ?? '')}: {estimate.share.toFixed(1)}%
									{#if 'novelty' in target && target.novelty}({$t('range 0–2%')}){:else}&plusmn;{estimate.margin}{/if}</em>{/if}
							{/each}
						{:else}
							<em>{$t('A private poll will reveal this opponent’s voter-group breakdown.')}</em>
						{/if}
					{/if}
					{#if forecast}<em class="forecast">{$t('Projected vote share: {share}% ±{margin}', { share: forecast.share, margin: forecast.margin })}</em>{/if}
				</span>
			</button>
		{/each}
	</div>
{/if}

{#if stage === 'day' && confirmation && risk}
	<section class="card" aria-labelledby="special-confirm-title">
		<h2 id="special-confirm-title">{`${$t(confirmation.action.name)}: ${$t('review the risks')}`}</h2>
		<p>{$t(confirmation.action.description)}</p>
		{#if confirmation.target}<p>{$t('Target: {name}', { name: $t(active.rivals.find((r) => r.id === confirmation?.target)?.name ?? groups.find((g) => g.id === confirmation?.target)?.name ?? '') })}</p>{/if}
		<h3>{$t('Paid on every attempt')}</h3>
		<p>{$t('Campaign budget: {cost}. Uses today’s normal move, even if it fails.', { cost: pounds(confirmation.action.cost) })}</p>
		<p>{$t('Credibility: {pct}% of your current {current} points ({cost} points).', { pct: risk.credibilityCostPct, current: game.credibility.toFixed(1), cost: risk.credibilityCost.toFixed(1) })}</p>
		<h3>{risk.failureChance === 0 ? $t('Transaction effects') : $t('Reward if successful')}</h3>
		<ul>
			{#each confirmation.action.effects as effect}
				<li>{effect.on === 'all' ? $t('All groups / operator') : effect.on === 'target' ? $t('Selected target') : $t(groups.find((g) => g.id === effect.on)?.name ?? effect.on)}: {$t(effect.stat)} {effect.delta > 0 ? '+' : ''}{effect.delta}{effect.spin ? ` (${$t('scaled by gullibility')})` : ''}</li>
			{/each}
		</ul>
		<p class="hint">{$t('Support gains draw from the selected rival if targeted and cannot exceed available votes; stats are bounded. These are conditional rewards, not a guaranteed forecast.')}</p>
		<h3>{$t('What could go wrong')}</h3>
		{#if risk.failureChance > 0}
			<p>{$t(risk.track === 'ruthlessness' ? 'Chance of being caught: {chance}% per attempt.' : 'Chance of failure: {chance}% per attempt.', { chance: (risk.failureChance * 100).toFixed(1) })}</p>
			<p>{$t('No success rewards on failure. Additional credibility loss: {pct}% of your credibility before this attempt ({cost} points, capped at what remains).', { pct: risk.failureCredibilityPct, cost: risk.failureCredibilityCost.toFixed(1) })}</p>
			<ul>{#each risk.failureEffects as effect}<li>{effect.on === 'all' ? $t('All groups / operator') : $t(effect.on)}: {$t(effect.stat)} {effect.delta > 0 ? '+' : ''}{effect.delta}</li>{/each}</ul>
			{#if risk.dismissalChance > 0}
				<p>{$t('Dismissal if caught: {caught}%. Overall dismissal risk per attempt: {overall}%.', { caught: (risk.dismissalChance * 100).toFixed(1), overall: (risk.overallDismissalChance * 100).toFixed(1) })}</p>
				{#if contract.dismissalRiskMultiplier < 1}<p>{$t('This client tolerates dirty tactics and reduces dismissal risk. They can still throw you under the bus.')}</p>{/if}
				<p>{$t('Dismissal ends this account immediately, forfeits its fee and bonuses, and affects your reputation. Other accounts and your career continue.')}</p>
			{/if}
		{:else}
			<p>{$t('This is a certain transaction: no random failure or dismissal risk.')}</p>
		{/if}
		<div class="row nav">
			<button class="ghost" onclick={() => (confirmation = null)}>{$t('Cancel — back to actions')}</button>
			<button disabled={!canAfford(game, confirmation.action) || unmetRequirements(game, confirmation.action).length > 0}
				onclick={() => confirmation && play({ kind: 'action', actionId: confirmation.action.id, target: confirmation.target })}>{$t('Confirm special action')}</button>
		</div>
	</section>
{/if}

{#if stage === 'feedback' && last}
	{#if last.specialOutcome}<h2>{$t(last.specialOutcome === 'success' ? 'Special action succeeded' : last.specialOutcome === 'caught' ? 'Caught — scheme failed' : last.specialOutcome === 'dismissed' ? 'Thrown under the bus' : 'Special action failed')}</h2>{/if}
	<p class="flavour">{$t(last.flavour)}</p>

	{#if last.feedback.length > 0}
		<ul class="feedback">
			{#each last.feedback as line, i (i)}
				<li>
					<span>
						{$t(line.label)}
						{#if !line.certain}<span class="uncertain">— {$t("you won't know until election night")}</span>{/if}
					</span>
					<span class="delta {line.delta > 0 ? 'up' : 'down'}">{formatDelta(line)}</span>
				</li>
			{/each}
		</ul>
	{:else if last.pollCommissioned}
		<p class="hint">{$t('No voter movement today. The poll results arrive tomorrow.')}</p>
	{:else if !last.triggeredEventId}
		<p class="hint">{$t('No measurable effect. It happens.')}</p>
	{/if}

	{#if last.gaffe}
		<div class="card">
			<div class="headline">{$t(last.gaffe.headline)}</div>
			<p>{$t('Your candidate went off-script. You were not in the room.')}</p>
			<ul class="feedback">
				{#each last.gaffe.feedback as line, i (i)}
					<li>
						<span>{$t(line.label)}</span>
						<span class="delta {line.delta > 0 ? 'up' : 'down'}">{formatDelta(line)}</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if pendingEvent}
		<button onclick={() => (stage = 'event')}>{$t('Continue')}</button>
	{:else if simple}
		{@render endDayButton()}
	{:else}
		<button onclick={onBack}>{$t('Back to dashboard')}</button>
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
				<span>{$t('FEED ERROR 0x00C10UD')}</span>
				<span>{$t('RETRYING LOCAL COPY // SOURCE DATA INCONSISTENT')}</span>
			</div>
		{/if}
		<div class="headline">{$t(pendingEvent.headline)}</div>
		<p>{$t(pendingEvent.body)}</p>
		<div class="actions">
			{#each pendingEvent.responses as response, i (response.label)}
				<button
					class="action"
					onclick={() => play({ kind: 'respond', eventId: pendingEvent.id, responseIndex: i })}
				>
					<span>
						<strong>{$t(response.label)}</strong>
						{#if response.hint}<em>{$t(response.hint)}</em>{/if}
					</span>
				</button>
			{/each}
		</div>
	</section>
{/if}

{#if stage === 'done'}
	<div class="card">
		<h3>{$t('Done for today')}</h3>
		{#if simple}
			<p>{$t("Today's move is in.")}</p>
			{@render endDayButton()}
		{:else}
			<p>{$t("Today's move on this account is in. Come back once the day has passed.")}</p>
			<button onclick={onBack}>{$t('Back to dashboard')}</button>
		{/if}
	</div>
{/if}

{#snippet endDayButton()}
	{#if instantAdvance}
		<button onclick={nextDay}>{finalDay ? $t('Tester: close polls and count') : $t('Tester: advance to day {day}', { day: game.day + 1 })}</button>
	{:else}
		<p role="status">{$t(finalDay ? 'The count opens at {time}. Missed days count as idle days.' : 'Your next campaign day opens at {time}. Missed days count as idle days.', { time: nextDayLabel })}</p>
	{/if}
{/snippet}

<details class="campaign-information">
	<summary>{$t('Opponents & public polling')}</summary>
	{#each active.rivals as rival (rival.id)}
		<p><strong>{$t(rival.name)}</strong>{rival.novelty ? ` — ${$t('novelty contender (never a client)')}` : ''} — {$t(rival.blurb)}</p>
	{/each}
	<PollReportView report={publicReport} content={active} today={game.day} privateReport={false} />

	<section class="poll-purchase">
		<h3>{$t('Commission a private poll')}</h3>
		<p class="hint">{$t('One per account per day, in addition to your campaign move. Results arrive tomorrow.')}</p>
		{#if pollMessage}<p role="status">{pollMessage}</p>{/if}
		{#if game.pollPurchasedOnDay === game.day}
			<p>{$t('Today’s poll is on order.')}</p>
		{:else if finalDay}
			<p>{$t('No campaign day remains to use a new poll.')}</p>
		{:else}
			<div class="actions">
				{#each active.actions.filter((a) => a.pollMargin) as action (action.id)}
					<button class="action" disabled={!canAfford(game, action)}
						onclick={() => play({ kind: 'poll', actionId: action.id })}>
						<span><strong>{action.name}</strong><em>{action.description}</em></span><span class="cost">{pounds(action.cost)}</span>
					</button>
				{/each}
			</div>
		{/if}
	</section>

	{#if game.reports.length > 0}
		<details class="card" open>
			<summary>{$t('Private polling reports ({count})', { count: game.reports.length })}</summary>
			{#each [...game.reports].reverse() as report (report.availableOnDay)}
				<PollReportView {report} content={active} today={game.day} />
			{/each}
		</details>
	{/if}
</details>

{#if game.news.length > 0}
	<details class="card">
		<summary>{$t('Newspaper archive ({count})', { count: game.news.length })}</summary>
		{#each [...game.news].reverse() as item (item.id)}
			<article class="newspaper">
				<p class="dateline">{$t('The Constituency Chronicle')} · {$t('Day {day}', { day: item.day })}</p>
				<h3>{$t(item.headline)}</h3><p>{$t(item.body)}</p>
			</article>
		{/each}
	</details>
{/if}
