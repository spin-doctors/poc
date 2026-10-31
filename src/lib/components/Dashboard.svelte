<script lang="ts">
	import { t } from '$lib/i18n';
	import { scenarios } from '$lib/content';
	import { pounds } from '$lib/format';
	import {
		accountCapacity,
		campaignView,
		canAccept,
		careerOffers,
		type CareerState
	} from '$lib/sim/career';
	import { IDLE_MORALE_PENALTY, pollEstimate } from '$lib/sim/engine';

	interface Props {
		career: CareerState;
		onOpen: (campaignId: number) => void;
		onAccept: (scenarioId: string) => void;
		onResult: (historyIndex: number) => void;
		onTick: () => void;
		instantAdvance: boolean;
		nextDayLabel: string;
	}

	let { career, onOpen, onAccept, onResult, onTick, instantAdvance, nextDayLabel }: Props = $props();

	const operator = $derived(career.company ?? career.stats);
	const cash = $derived(career.company ? career.company.cash : career.stats.personalFunds);
	const capacity = $derived(accountCapacity(career));
	const offers = $derived(careerOffers(career, scenarios));
	const rows = $derived(
		career.active.map((campaign) => {
			const content = scenarios[campaign.scenarioId];
			const state = campaignView(career, campaign.id);
			const status = state.pendingEventId
				? $t('Story waiting')
				: state.turnTaken
					? $t('Done for today')
					: $t('Needs a move');
			return { campaign, content, state, status, poll: pollEstimate(state, content) };
		})
	);
	const idle = $derived(rows.filter((r) => !r.state.turnTaken).length);
	const results = $derived(
		career.history.map((outcome, index) => ({ outcome, index })).reverse()
	);
</script>

<p class="dateline">{$t('Day {day}', { day: career.day })} &middot; {career.company?.profile.name ?? $t('Freelance operator')}</p>

<section class="status">
	<div><span>{$t(career.company ? 'Company cash' : 'Your funds')}</span><strong>{pounds(cash)}</strong></div>
	<div><span>{$t('Credibility')}</span><strong>{Math.round(operator.credibility)}</strong></div>
	<div><span>{$t('Ruthlessness')}</span><strong>{Math.round(operator.ruthlessness)}</strong></div>
	<div><span>{$t('Recognition')}</span><strong>{Math.round(operator.recognition)}</strong></div>
	<div><span>{$t('Accounts')}</span><strong>{career.active.length} / {capacity}</strong></div>
</section>

<h2>{$t('Active accounts')}</h2>
{#if rows.length === 0}
	<p class="hint">{$t('No clients on the books. Take a job from the offers below.')}</p>
{:else}
	<table class="accounts accounts-active">
		<thead>
			<tr>
				<th>{$t('Client')}</th>
				<th>{$t('Day')}</th>
				<th>{$t('Budget')}</th>
				<th>{$t('Poll')}</th>
				<th>{$t('Morale')}</th>
				<th>{$t('Today')}</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.campaign.id)}
				<tr>
					<td>
						<strong>{row.content.contract.seat}</strong>
						<span class="sub">{row.content.contract.candidateName}</span>
					</td>
					<td>
						{row.state.day} / {row.content.contract.days}
						{#if row.state.day === row.content.contract.days}
							<span class="sub">{$t('Polls tonight')}</span>
						{/if}
					</td>
					<td>{pounds(row.state.money)}</td>
					<td>{row.poll.share}% <span class="uncertain">&plusmn;{row.poll.margin}</span></td>
					<td>{Math.round(row.state.morale)}</td>
					<td class:attention={!row.state.turnTaken}>{row.status}</td>
					<td>
						<button class:ghost={row.state.turnTaken} onclick={() => onOpen(row.campaign.id)}>
							{$t('Open')}
						</button>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

<div class="card">
	<h3>{instantAdvance ? $t('Playtest') : $t('The calendar')}</h3>
	<p>
		{$t('The next day opens at {time}.', { time: nextDayLabel })}
		{#if idle > 0}
			{idle === 1
				? $t('One account still has no move today and will lose {penalty} morale.', { penalty: IDLE_MORALE_PENALTY })
				: $t('{count} accounts still have no move today and will lose {penalty} morale.', { count: idle, penalty: IDLE_MORALE_PENALTY })}
		{/if}
	</p>
	{#if instantAdvance}<button class="ghost" onclick={onTick}>{$t('Tester: simulate next day')}</button>{/if}
</div>

{#if results.length > 0}
	<h2>{$t('Results')}</h2>
	<table class="accounts">
		<thead>
			<tr>
				<th>{$t('Client')}</th>
				<th>{$t('Called')}</th>
				<th>{$t('Share')}</th>
				<th>{$t('Verdict')}</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each results as { outcome, index } (index)}
				<tr>
					<td>
						<strong>{$t(scenarios[outcome.scenarioId].contract.seat)}</strong>
						{#if outcome.decidedOnDay === career.day - 1}<span class="sub new">{$t('New')}</span>{/if}
					</td>
					<td>{$t('Day {day}', { day: outcome.decidedOnDay })}</td>
					<td>{outcome.kind === 'election' ? `${outcome.election.voteShare}%` : $t('No count — dismissed early')}</td>
					<td class="delta {outcome.kind === 'dismissal' || outcome.election.sacked ? 'down' : 'up'}">
						{$t(outcome.kind === 'dismissal' ? 'Thrown under the bus' : outcome.election.sacked ? 'Sacked' : 'Kept')}
					</td>
					<td><button class="ghost" onclick={() => onResult(index)}>{$t('Election night')}</button></td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

<h2>{$t("Who's calling")}</h2>
<div class="actions">
	{#each offers as offer (offer.scenarioId)}
		{@const job = scenarios[offer.scenarioId].contract}
		{@const available = canAccept(career, scenarios, offer.scenarioId)}
		<button
			class="action"
			class:locked={!available}
			disabled={!available}
			onclick={() => onAccept(offer.scenarioId)}
		>
			<span>
				<strong>{job.candidateName} — {$t(job.seat)}, {$t(job.election)}</strong>
				<em>{$t(job.pitch)}</em>
				<em>{$t('{days} days, {budget} campaign budget', { days: job.days, budget: pounds(job.budget) })}</em>
				{#each offer.unmet as lock (lock.stat)}
					<em class="lock">🔒 {$t(lock.label)}</em>
				{/each}
				{#if offer.running}
					<em class="lock">{$t('You are already running this campaign')}</em>
				{:else if offer.unmet.length === 0 && career.active.length >= capacity}
					<em class="lock">
						{career.company
							? $t('Every staffer is busy — hire more from company management')
							: $t('You can only run one account alone — incorporate and hire staff')}
					</em>
				{/if}
			</span>
			<span class="cost">{$t('Fee {fee}', { fee: pounds(job.fee) })}</span>
		</button>
	{/each}
</div>
