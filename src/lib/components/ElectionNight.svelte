<script lang="ts">
	import { scenarios } from '$lib/content';
	import { pounds, sign } from '$lib/format';
	import type { CampaignOutcome } from '$lib/sim/career';

	interface Props {
		outcome: CampaignOutcome;
		onBack: () => void;
	}

	let { outcome, onBack }: Props = $props();

	const contract = $derived(scenarios[outcome.scenarioId].contract);
	const election = $derived(outcome.election);
</script>

<p class="dateline">{contract.candidateName} &middot; {contract.seat} &middot; {contract.election}</p>

<div class="row nav">
	<button class="ghost" onclick={onBack}>&larr; Dashboard</button>
</div>

<h2>Election night</h2>
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

<div class="verdict" class:sacked={election.sacked}>
	<h3>{election.sacked ? 'You are sacked' : 'You keep the account'}</h3>
	<ul class="objectives">
		{#each election.objectives as objective (objective.id)}
			<li>
				<span class="delta {objective.met ? 'up' : 'down'}">{objective.met ? '✓' : '✗'}</span>
				{objective.label} — you got {objective.actual}
			</li>
		{/each}
	</ul>
	<p>{election.sacked ? contract.sackMessage : contract.keepMessage}</p>
	<ul class="feedback">
		<li>
			<span>Fee</span>
			<span class="delta {outcome.feeEarned > 0 ? 'up' : 'down'}">{pounds(outcome.feeEarned)}</span>
		</li>
		<li>
			<span>Recognition</span>
			<span class="delta {outcome.recognitionDelta >= 0 ? 'up' : 'down'}"
				>{sign(outcome.recognitionDelta)}</span
			>
		</li>
	</ul>
</div>

<button onclick={onBack}>Back to dashboard</button>
