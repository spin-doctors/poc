<script lang="ts">
	import { pounds } from '$lib/format';
	import {
		accountCapacity,
		canHire,
		canIncorporate,
		DAILY_WAGE,
		HIRE_FEE,
		INCORPORATION_FEE,
		type CareerState,
		type CompanyProfile
	} from '$lib/sim/career';

	interface Props {
		career: CareerState;
		onIncorporate: (profile: CompanyProfile) => void;
		onHire: () => void;
		onNewCareer: () => void;
		onBack: () => void;
	}

	let { career, onIncorporate, onHire, onNewCareer, onBack }: Props = $props();

	let companyName = $state('');
	let companyLogo = $state('');
	let companyValues = $state('');

	const kept = $derived(career.history.filter((h) => !h.election.sacked).length);

	function incorporate() {
		onIncorporate({
			name: companyName.trim() || 'Untitled Strategy Group',
			logo: companyLogo.trim() || null,
			values: companyValues
				.split(',')
				.map((value) => value.trim())
				.filter(Boolean)
		});
	}
</script>

<p class="dateline">Career &middot; Day {career.day}</p>

<div class="row nav">
	<button class="ghost" onclick={onBack}>&larr; Dashboard</button>
</div>

<div class="card">
	{#if career.company}
		<h3>{career.company.profile.name}</h3>
		<section class="status">
			<div><span>Company cash</span><strong>{pounds(career.company.cash)}</strong></div>
			<div><span>Credibility</span><strong>{Math.round(career.company.credibility)}</strong></div>
			<div><span>Ruthlessness</span><strong>{Math.round(career.company.ruthlessness)}</strong></div>
			<div><span>Recognition</span><strong>{Math.round(career.company.recognition)}</strong></div>
			<div><span>Accounts kept</span><strong>{kept} / {career.history.length}</strong></div>
		</section>
		{#if career.company.profile.logo}
			<p class="hint">Logo: {career.company.profile.logo}</p>
		{/if}
		{#if career.company.profile.values.length > 0}
			<p class="hint">Values: {career.company.profile.values.join(' · ')}</p>
		{/if}
	{:else}
		<h3>Freelance operator</h3>
		<p class="hint">
			Unincorporated operators are paid directly, and campaign credibility effects hit them
			personally. Alone, you can only run one account at a time.
		</p>
		<section class="status">
			<div><span>Recognition</span><strong>{Math.round(career.stats.recognition)}</strong></div>
			<div><span>Credibility</span><strong>{Math.round(career.stats.credibility)}</strong></div>
			<div><span>Ruthlessness</span><strong>{Math.round(career.stats.ruthlessness)}</strong></div>
			<div><span>Your funds</span><strong>{pounds(career.stats.personalFunds)}</strong></div>
			<div><span>Accounts kept</span><strong>{kept} / {career.history.length}</strong></div>
		</section>
		<fieldset>
			<legend>Incorporate your firm ({pounds(INCORPORATION_FEE)})</legend>
			<label>
				Company name
				<input bind:value={companyName} placeholder="Untitled Strategy Group" />
			</label>
			<label>
				Logo (optional)
				<input bind:value={companyLogo} placeholder="e.g. /logos/mark.svg" />
			</label>
			<label>
				Values (comma-separated)
				<input bind:value={companyValues} placeholder="Integrity, Service, Winning" />
			</label>
		</fieldset>
		<button disabled={!canIncorporate(career)} onclick={incorporate}>
			{canIncorporate(career)
				? 'Incorporate now'
				: `Need ${pounds(INCORPORATION_FEE)} to incorporate`}
		</button>
	{/if}
</div>

{#if career.company}
	<div class="card">
		<h3>Staff</h3>
		<p>
			Each staffer runs one more account at once. Hiring costs {pounds(HIRE_FEE)}, and every
			staffer draws {pounds(DAILY_WAGE)} a day from company cash.
		</p>
		<section class="status">
			<div><span>Staff</span><strong>{career.company.staff}</strong></div>
			<div><span>Account capacity</span><strong>{accountCapacity(career)}</strong></div>
			<div>
				<span>Daily wages</span><strong>{pounds(career.company.staff * DAILY_WAGE)}</strong>
			</div>
		</section>
		<button disabled={!canHire(career)} onclick={onHire}>
			{canHire(career) ? `Hire a staffer (${pounds(HIRE_FEE)})` : `Need ${pounds(HIRE_FEE)} to hire`}
		</button>
	</div>
{/if}

<button class="ghost" onclick={onNewCareer}>Start a new career</button>
