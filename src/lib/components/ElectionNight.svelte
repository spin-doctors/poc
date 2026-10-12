<script lang="ts">
	import { scenarios } from '$lib/content';
	import { pounds, sign } from '$lib/format';
	import PollReportView from './PollReportView.svelte';
	import type { CampaignOutcome } from '$lib/sim/career';

	interface Props {
		outcome: CampaignOutcome;
		/** The single-campaign game: no dashboard or fees, just the next client. */
		simple?: boolean;
		onNext?: () => void;
		/** Set when this result ended the career: where the spin doctor ends up instead. */
		epilogue?: string;
		onRestart?: () => void;
		onBack: () => void;
	}

	let { outcome, simple = false, onNext, epilogue, onRestart, onBack }: Props = $props();

	const contract = $derived(scenarios[outcome.scenarioId].contract);
	const election = $derived(outcome.election);
</script>

<p class="dateline">{contract.candidateName} &middot; {contract.seat} &middot; {contract.election}</p>

{#if !simple && !epilogue}
	<div class="row nav">
		<button class="ghost" onclick={onBack}>&larr; Dashboard</button>
	</div>
{/if}

{#if outcome.kind === 'dismissal'}
	<h2>Thrown under the bus</h2>
	<article class="newspaper">
		<p class="dateline">The Constituency Chronicle · Campaign scandal</p>
		<h3>{outcome.dismissal.headline}</h3>
		<p>{outcome.dismissal.body}</p>
	</article>
	<p>Your account ended before the count. No fee or bonuses were paid. The credibility loss follows you, but your career continues.</p>
	<p>Credibility lost: {outcome.dismissal.credibilityLoss.toFixed(1)} points.</p>
	<p>Recognition: {sign(outcome.recognitionDelta)}</p>
{:else if election}
<h2>Election night</h2>
<article class="newspaper">
	<p class="dateline">The Constituency Chronicle · Election edition</p>
	<h3>{election.winnerId ? `${election.candidates.find((c) => c.id === election.winnerId)?.name} takes the seat` : 'Dead heat at the count'}</h3>
	<p>{election.winnerId === 'client' ? 'Your candidate finishes first. Now comes the conversation about the contract.' : 'The returning officer has read the numbers. Your contract objectives decide what happens to your job.'}</p>
</article>
<div class="table-scroll">
	<table>
		<thead><tr><th>Candidate</th><th>Votes</th><th>Share</th></tr></thead>
		<tbody>
			{#each [...election.candidates].sort((a, b) => b.votes - a.votes) as candidate (candidate.id)}
				<tr><td>{candidate.name}{candidate.id === election.winnerId ? ' — elected' : ''}</td><td>{candidate.votes.toLocaleString('en-GB')}</td><td>{candidate.share}%</td></tr>
			{/each}
		</tbody>
	</table>
</div>
<table>
	<thead>
		<tr>
			<th>Group</th>
			<th>Support</th>
			<th>Turnout</th>
			<th>Votes for us</th>
		</tr>
	</thead>
	<tbody>
		{#each election.groups as row (row.groupId)}
			<tr>
				<td>{row.name}</td>
				<td>{row.support}%</td>
				<td>{row.turnoutPct}%</td>
				<td>{new Intl.NumberFormat('en-GB').format(row.votesForUs)}</td>
			</tr>
		{/each}
		<tr>
			<td><strong>Final share</strong></td>
			<td colspan="3"><strong>{election.voteShare}%</strong></td>
		</tr>
	</tbody>
</table>

<details class="card">
	<summary>Every candidate’s votes by voter group</summary>
	<div class="table-scroll">
		<table>
			<thead>
				<tr><th>Group</th>{#each election.candidates as candidate (candidate.id)}<th>{candidate.name}</th>{/each}</tr>
			</thead>
			<tbody>
				{#each election.groups as group (group.groupId)}
					<tr><td>{group.name}</td>{#each election.candidates as candidate (candidate.id)}<td>{group.candidateVotes[candidate.id].toLocaleString('en-GB')}</td>{/each}</tr>
				{/each}
			</tbody>
		</table>
	</div>
</details>

<div class="verdict" class:sacked={election.sacked}>
	<h3>{election.sacked ? 'You are sacked' : 'You keep the account'}</h3>
	<ul class="objectives">
		{#each election.objectives.filter((o) => !o.optional) as objective (objective.id)}
			<li>
				<span class="delta {objective.met ? 'up' : 'down'}">{objective.met ? '✓' : '✗'}</span>
				{objective.label} — you got {objective.actual}
			</li>
		{/each}
	</ul>
	<h3>Optional bonuses</h3>
	<ul class="objectives">
		{#each election.objectives.filter((o) => o.optional) as objective (objective.id)}
			<li>{objective.met ? '✓' : '✗'} {objective.label}
				— {objective.met && !election.sacked ? 'Earned' : objective.met ? 'Not paid: account lost' : 'Not achieved'}
				({pounds(objective.reward?.funds ?? 0)}, {objective.reward?.recognition ?? 0} recognition)</li>
		{/each}
	</ul>
	<p>{election.sacked ? contract.sackMessage : contract.keepMessage}</p>
	<ul class="feedback">
		<li><span>Bonus funds</span><span>{pounds(outcome.bonusFunds)}</span></li>
		<li><span>Bonus recognition</span><span>{outcome.bonusRecognition}</span></li>
		{#if !simple}
			<li>
				<span>Fee</span>
				<span class="delta {outcome.feeEarned > 0 ? 'up' : 'down'}">{pounds(outcome.feeEarned)}</span>
			</li>
		{/if}
		<li>
			<span>Recognition</span>
			<span class="delta {outcome.recognitionDelta >= 0 ? 'up' : 'down'}"
				>{sign(outcome.recognitionDelta)}</span
			>
		</li>
	</ul>
</div>

{/if}
{#if outcome.reports.length > 0}
	<details class="card">
		<summary>Campaign’s private polling archive</summary>
		{#each outcome.reports as report (report.availableOnDay)}
			<PollReportView {report} content={scenarios[outcome.scenarioId]} today={contract.days + 1} />
		{/each}
	</details>
{/if}
{#if outcome.news.length > 0}
	<details class="card">
		<summary>Campaign newspaper archive</summary>
		{#each outcome.news as item (item.id)}
			<article class="newspaper"><p class="dateline">Day {item.day}</p><h3>{item.headline}</h3><p>{item.body}</p></article>
		{/each}
	</details>
{/if}

{#if epilogue}
	<div class="card">
		<h3>Game over</h3>
		<p>Nobody is calling. Nobody is going to call.</p>
		<p>{epilogue}</p>
	</div>
	<button onclick={onRestart}>Start again</button>
{:else if simple && onNext}
	<button onclick={onNext}>{outcome.kind === 'election' && outcome.election.sacked ? 'Take whatever work you can get' : 'Meet your next client'}</button>
{:else}
	<button onclick={onBack}>Back to dashboard</button>
{/if}
