<script lang="ts">
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
		onCareer: () => void;
	}

	let { career, onOpen, onAccept, onResult, onTick, onCareer }: Props = $props();

	const operator = $derived(career.company ?? career.stats);
	const cash = $derived(career.company ? career.company.cash : career.stats.personalFunds);
	const capacity = $derived(accountCapacity(career));
	const offers = $derived(careerOffers(career, scenarios));
	const rows = $derived(
		career.active.map((campaign) => {
			const content = scenarios[campaign.scenarioId];
			const state = campaignView(career, campaign.id);
			const status = state.pendingEventId
				? 'Story waiting'
				: state.turnTaken
					? 'Done for today'
					: 'Needs a move';
			return { campaign, content, state, status, poll: pollEstimate(state, content) };
		})
	);
	const idle = $derived(rows.filter((r) => !r.state.turnTaken).length);
	const results = $derived(
		career.history.map((outcome, index) => ({ outcome, index })).reverse()
	);
</script>

<p class="dateline">Day {career.day} &middot; {career.company?.profile.name ?? 'Freelance operator'}</p>

<section class="status">
	<div><span>{career.company ? 'Company cash' : 'Your funds'}</span><strong>{pounds(cash)}</strong></div>
	<div><span>Credibility</span><strong>{Math.round(operator.credibility)}</strong></div>
	<div><span>Ruthlessness</span><strong>{Math.round(operator.ruthlessness)}</strong></div>
	<div><span>Recognition</span><strong>{Math.round(operator.recognition)}</strong></div>
	<div><span>Accounts</span><strong>{career.active.length} / {capacity}</strong></div>
</section>

<div class="row nav">
	<button class="ghost" onclick={onCareer}>
		{career.company ? 'Manage company' : 'Career & incorporation'}
	</button>
</div>

<h2>Active accounts</h2>
{#if rows.length === 0}
	<p class="hint">No clients on the books. Take a job from the offers below.</p>
{:else}
	<table class="accounts accounts-active">
		<thead>
			<tr>
				<th>Client</th>
				<th>Day</th>
				<th>Budget</th>
				<th>Poll</th>
				<th>Morale</th>
				<th>Today</th>
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
							<span class="sub">Polls tonight</span>
						{/if}
					</td>
					<td>{pounds(row.state.money)}</td>
					<td>{row.poll.share}% <span class="uncertain">&plusmn;{row.poll.margin}</span></td>
					<td>{Math.round(row.state.morale)}</td>
					<td class:attention={!row.state.turnTaken}>{row.status}</td>
					<td>
						<button class:ghost={row.state.turnTaken} onclick={() => onOpen(row.campaign.id)}>
							Open
						</button>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

<div class="card">
	<h3>Playtest</h3>
	<p>
		Days pass on their own in the full game. For now, end the day by hand.
		{#if idle > 0}
			{idle} account{idle === 1 ? '' : 's'} still {idle === 1 ? 'has' : 'have'} no move today and
			will lose {IDLE_MORALE_PENALTY} morale.
		{/if}
	</p>
	<button class="ghost" onclick={onTick}>Simulate next day</button>
</div>

{#if results.length > 0}
	<h2>Results</h2>
	<table class="accounts">
		<thead>
			<tr>
				<th>Client</th>
				<th>Called</th>
				<th>Share</th>
				<th>Verdict</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each results as { outcome, index } (index)}
				<tr>
					<td>
						<strong>{scenarios[outcome.scenarioId].contract.seat}</strong>
						{#if outcome.decidedOnDay === career.day - 1}<span class="sub new">New</span>{/if}
					</td>
					<td>Day {outcome.decidedOnDay}</td>
					<td>{outcome.election.voteShare}%</td>
					<td class="delta {outcome.election.sacked ? 'down' : 'up'}">
						{outcome.election.sacked ? 'Sacked' : 'Kept'}
					</td>
					<td><button class="ghost" onclick={() => onResult(index)}>Election night</button></td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

<h2>Who's calling</h2>
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
				<strong>{job.candidateName} — {job.seat}, {job.election}</strong>
				<em>{job.pitch}</em>
				<em>{job.days} days, {pounds(job.budget)} campaign budget</em>
				{#each offer.unmet as lock (lock.stat)}
					<em class="lock">🔒 {lock.label}</em>
				{/each}
				{#if offer.running}
					<em class="lock">You are already running this campaign</em>
				{:else if offer.unmet.length === 0 && career.active.length >= capacity}
					<em class="lock">
						{career.company
							? 'Every staffer is busy — hire more from company management'
							: 'You can only run one account alone — incorporate and hire staff'}
					</em>
				{/if}
			</span>
			<span class="cost">Fee {pounds(job.fee)}</span>
		</button>
	{/each}
</div>
