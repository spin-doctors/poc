<script lang="ts">
	import type { Content } from '$lib/schema/content';
	import type { PollReport } from '$lib/sim/types';
	let { report, content, today, privateReport = true }: {
		report: PollReport; content: Content; today: number; privateReport?: boolean;
	} = $props();
	const range = (share: number, margin: number, id: string) => {
		const maximum = content.rivals.find((r) => r.id === id)?.novelty ? 2 : 100;
		return `${Math.max(0, share - margin).toFixed(1)}–${Math.min(maximum, share + margin).toFixed(1)}%`;
	};
</script>

<section class:card={privateReport} class:newspaper={!privateReport}>
	<p class="dateline">{privateReport ? 'Private polling report' : 'The Constituency Chronicle'} · Day {report.availableOnDay}</p>
	<h3>{privateReport ? 'The pollster’s briefing' : 'How the race stands'}</h3>
	{#if report.availableOnDay < today}<p class="hint">Historical report — not today’s standings.</p>{/if}
	<p class="hint">Estimated vote share, not a promise. Small novelty-candidate estimates stay within 0–2%.</p>
	<div class="table-scroll">
		<table>
			<thead><tr><th>Candidate</th><th>Estimate</th><th>Reported range</th></tr></thead>
			<tbody>
				{#each report.standings as candidate (candidate.id)}
					<tr><td>{candidate.name}</td><td>{candidate.share.toFixed(1)}%</td><td>{range(candidate.share, candidate.margin, candidate.id)}</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if privateReport}
		<details>
			<summary>Voter-group breakdown</summary>
			{#each report.groups as group (group.groupId)}
				<h4>{content.groups.find((g) => g.id === group.groupId)?.name}</h4>
				<div class="table-scroll">
					<table>
						<thead><tr><th>Candidate</th><th>Estimate</th><th>Reported range</th></tr></thead>
						<tbody>
							{#each group.standings as candidate (candidate.id)}
								<tr><td>{candidate.name}</td><td>{candidate.share.toFixed(1)}%</td><td>{range(candidate.share, candidate.margin, candidate.id)}</td></tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/each}
		</details>
	{/if}
</section>
