<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { trackAnalyticsEvent } from '$lib/analytics';
	import { loadCareer, saveCareer, type SavedCareer } from '$lib/careerStorage';
	import { defaultScenarioId, scenarios } from '$lib/content';
	import { decodeRun, encodeRun } from '$lib/share';
	import {
		canIncorporate,
		careerOffers,
		completeCampaign,
		INCORPORATION_FEE,
		incorporateCareer,
		nextCampaignSeed,
		replayCareer,
		startCareer,
		startingStats,
		type CampaignOutcome,
		type CampaignRecord,
		type CareerState
	} from '$lib/sim/career';
	import {
		applyMove,
		canAfford,
		defaultStart,
		forecastAction,
		isUnlocked,
		pollEstimate,
		replay,
		runElection,
		unmetRequirements
	} from '$lib/sim/engine';
	import type {
		ElectionResult,
		FeedbackLine,
		GameState,
		MoveResult,
		StartingStats
	} from '$lib/sim/types';

	type Phase = 'offers' | 'briefing' | 'day' | 'feedback' | 'event' | 'election';

	function freshCareer(): { saved: SavedCareer; career: CareerState } {
		const careerSeed = Math.floor(Math.random() * 2 ** 31);
		const career = startCareer(scenarios, defaultScenarioId, careerSeed);
		const current = { scenarioId: defaultScenarioId, seed: nextCampaignSeed(career), moves: [] };
		return { saved: { careerSeed, completed: [], current, incorporation: null }, career };
	}

	const initial = freshCareer();
	let saved = $state<SavedCareer>(initial.saved);
	let career = $state<CareerState>(initial.career);
	let scenarioId = $state(defaultScenarioId);
	let game = $state<GameState>(
		replay(scenarios[defaultScenarioId], initial.saved.current!.seed, [], startingStats(initial.career))
	);
	let phase = $state<Phase>('briefing');
	let last = $state<MoveResult | null>(null);
	let election = $state<ElectionResult | null>(null);
	let outcome = $state<CampaignOutcome | null>(null);
	let target = $state(scenarios[defaultScenarioId].groups[0].id);
	let copied = $state(false);
	let companyName = $state('');
	let companyLogo = $state('');
	let companyValues = $state('');
	/** Opened from a share link: playable, but never written into the saved career. */
	let replaying = $state(false);

	const active = $derived(scenarios[scenarioId]);
	const contract = $derived(active.contract);
	const groups = $derived(active.groups);
	const actions = $derived(active.actions);
	const poll = $derived(pollEstimate(game, active));
	const commissionedPoll = $derived(
		game.pollReport?.availableOnDay === game.day ? game.pollReport : null
	);
	const pendingEvent = $derived(active.events.find((e) => e.id === game.pendingEventId) ?? null);
	const money = $derived(new Intl.NumberFormat('en-GB').format(game.money));
	const offers = $derived(careerOffers(career, scenarios));
	const kept = $derived(career.history.filter((h) => !h.election.sacked).length);
	const incorporationFee = $derived(
		new Intl.NumberFormat('en-GB').format(INCORPORATION_FEE)
	);

	function beginCampaign(record: CampaignRecord, start: StartingStats) {
		const next = scenarios[record.scenarioId];
		if (!next) throw new Error(`Unknown scenario: ${record.scenarioId}`);
		game = replay(next, record.seed, record.moves, start);
		scenarioId = record.scenarioId;
		target = next.groups[0].id;
		last = null;
		election = null;
		outcome = null;
		copied = false;
		if (game.finished) showElection();
		else if (game.pendingEventId) phase = 'event';
		else phase = record.moves.length === 0 ? 'briefing' : 'day';
	}

	function loadSavedCareer() {
		let loaded = loadCareer();
		let rebuilt: CareerState | null = null;
		if (loaded) {
			try {
				rebuilt = replayCareer(
					scenarios,
					defaultScenarioId,
					loaded.careerSeed,
					loaded.completed,
					loaded.incorporation
				);
			} catch {
				loaded = null;
			}
		}
		if (!loaded || !rebuilt) {
			const fresh = freshCareer();
			loaded = fresh.saved;
			rebuilt = fresh.career;
		}
		saved = loaded;
		career = rebuilt;
		if (saved.current) {
			try {
				beginCampaign(saved.current, startingStats(career));
				saveCareer(saved);
				return;
			} catch {
				saved = { ...saved, current: null };
			}
		}
		saveCareer(saved);
		outcome = career.history.at(-1) ?? null;
		phase = 'offers';
	}

	onMount(() => {
		const code = new URLSearchParams(window.location.search).get('r');
		const run = code ? decodeRun(code) : null;
		const shared = run ? scenarios[run.scenarioId ?? defaultScenarioId] : undefined;
		if (run && shared) {
			try {
				replaying = true;
				beginCampaign(
					{ scenarioId: shared.contract.id, seed: run.seed, moves: run.moves },
					run.start ?? defaultStart(shared)
				);
				return;
			} catch {
				// A corrupt link just falls through to your own career.
				replaying = false;
			}
		}
		loadSavedCareer();
	});

	function persistMoves() {
		if (replaying || !saved.current) return;
		saved = { ...saved, current: { ...saved.current, moves: game.history } };
		saveCareer(saved);
	}

	function take(actionId: string, targeted: boolean) {
		last = applyMove(game, active, {
			kind: 'action',
			actionId,
			target: targeted ? target : undefined
		});
		game = last.state;
		persistMoves();
		phase = 'feedback';
	}

	function respond(index: number) {
		if (!pendingEvent) return;
		last = applyMove(game, active, {
			kind: 'respond',
			eventId: pendingEvent.id,
			responseIndex: index
		});
		game = last.state;
		persistMoves();
		phase = 'feedback';
	}

	function showElection() {
		election = runElection(game, active);
		trackAnalyticsEvent(election.sacked ? 'campaign-sacked' : 'campaign-kept');
		phase = 'election';
		if (replaying || !saved.current) return;
		career = completeCampaign(career, scenarios, saved.current);
		outcome = career.history.at(-1) ?? null;
		saved = { ...saved, completed: [...saved.completed, saved.current], current: null };
		saveCareer(saved);
	}

	function advance() {
		if (game.pendingEventId) phase = 'event';
		else if (game.finished) showElection();
		else phase = 'day';
	}

	function startCampaign() {
		trackAnalyticsEvent('campaign-started');
		phase = 'day';
	}

	function acceptOffer(id: string) {
		const record = { scenarioId: id, seed: nextCampaignSeed(career), moves: [] };
		saved = { ...saved, current: record };
		saveCareer(saved);
		beginCampaign(record, startingStats(career));
	}

	function newCareer() {
		if (!confirm('Walk away from this career and start again from nothing?')) return;
		const fresh = freshCareer();
		saved = fresh.saved;
		career = fresh.career;
		saveCareer(saved);
		beginCampaign(saved.current!, startingStats(career));
	}

	function leaveReplay() {
		replaying = false;
		replaceState(window.location.pathname, {});
		loadSavedCareer();
	}

	function incorporate() {
		if (replaying || career.company) return;
		if (!canIncorporate(career)) return;
		const afterCampaigns = career.history.length;
		const nextCareer = incorporateCareer(career, {
			name: companyName.trim() || 'Untitled Strategy Group',
			logo: companyLogo.trim() || null,
			values: companyValues
				.split(',')
				.map((value) => value.trim())
				.filter(Boolean)
		});
		career = nextCareer;
		if (!saved.incorporation && nextCareer.company) {
			saved = {
				...saved,
				incorporation: {
					afterCampaigns,
					profile: nextCareer.company.profile
				}
			};
			saveCareer(saved);
		}
	}

	async function copyLink() {
		const code = encodeRun({ seed: game.seed, moves: game.history, scenarioId, start: game.start });
		const url = `${window.location.origin}${window.location.pathname}?r=${code}`;
		await navigator.clipboard.writeText(url);
		trackAnalyticsEvent('share-link-copied');
		copied = true;
	}

	const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
	const pounds = (n: number) => `£${new Intl.NumberFormat('en-GB').format(n)}`;
	const groupName = (id: string) => groups.find((g) => g.id === id)?.name ?? id;

	function formatDelta(line: FeedbackLine) {
		if (line.stat === 'money' || line.stat === 'personalFunds') {
			const amount = new Intl.NumberFormat('en-GB').format(Math.abs(line.delta));
			return `${line.delta > 0 ? '+' : '−'}£${amount}`;
		}
		const suffix = line.stat === 'support' || line.stat === 'turnout' ? '%' : '';
		return `${sign(line.delta)}${suffix}`;
	}
</script>

<main>
	<header class="masthead">
		<h1>Spin Doctors</h1>
		{#if phase === 'offers'}
			<p>Between campaigns</p>
		{:else}
			<p>{contract.seat} &middot; {contract.election}</p>
		{/if}
	</header>

	{#if replaying}
		<p class="hint">
			You are playing a shared run. Nothing here touches your own career.
			<button class="ghost" onclick={leaveReplay}>Back to your career</button>
		</p>
	{/if}

	{#snippet careerSummary()}
		<div class="card">
			<h3>Company management</h3>
			{#if career.company}
				<p class="hint"><strong>{career.company.profile.name}</strong></p>
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
				<p class="hint">
					Unincorporated operators are paid directly, and campaign credibility effects hit them personally.
				</p>
				<section class="status">
					<div><span>Recognition</span><strong>{Math.round(career.stats.recognition)}</strong></div>
					<div><span>Credibility</span><strong>{Math.round(career.stats.credibility)}</strong></div>
					<div><span>Ruthlessness</span><strong>{Math.round(career.stats.ruthlessness)}</strong></div>
					<div><span>Your funds</span><strong>{pounds(career.stats.personalFunds)}</strong></div>
					<div><span>Accounts kept</span><strong>{kept} / {career.history.length}</strong></div>
				</section>
				<fieldset>
					<legend>Incorporate your firm (£{incorporationFee})</legend>
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
				<button class="ghost" disabled={replaying || !canIncorporate(career)} onclick={incorporate}>
					{#if replaying}
						Unavailable in shared replays
					{:else if canIncorporate(career)}
						Incorporate now
					{:else}
						Need £{incorporationFee} to incorporate
					{/if}
				</button>
			{/if}
			<button class="ghost" onclick={newCareer}>Start a new career</button>
		</div>
	{/snippet}

	{#snippet offerList()}
		<h2>Who's calling</h2>
		<div class="actions">
			{#each offers as offer (offer.scenarioId)}
				{@const job = scenarios[offer.scenarioId].contract}
				<button
					class="action"
					class:locked={offer.unmet.length > 0}
					disabled={offer.unmet.length > 0}
					onclick={() => acceptOffer(offer.scenarioId)}
				>
					<span>
						<strong>{job.candidateName} — {job.seat}, {job.election}</strong>
						<em>{job.pitch}</em>
						<em>{job.days} days, {pounds(job.budget)} campaign budget</em>
						{#each offer.unmet as lock (lock.stat)}
							<em class="lock">🔒 {lock.label}</em>
						{/each}
					</span>
					<span class="cost">Fee {pounds(job.fee)}</span>
				</button>
			{/each}
		</div>
	{/snippet}

	{#if phase !== 'briefing' && phase !== 'offers'}
		<section class="status">
			<div>
				<span>Day</span>
				<strong>{Math.min(game.day, contract.days)} / {contract.days}</strong>
			</div>
			<div>
				<span>Budget</span>
				<strong>&pound;{money}</strong>
			</div>
			<div>
				<span>Your funds</span>
				<strong>&pound;{new Intl.NumberFormat('en-GB').format(game.personalFunds)}</strong>
			</div>
			<div>
				<span>Candidate morale</span>
				<strong>{Math.round(game.morale)}</strong>
			</div>
			<div>
				<span>Your credibility</span>
				<strong>{Math.round(game.credibility)}</strong>
			</div>
			<div>
				<span>Your ruthlessness</span>
				<strong>{Math.round(game.ruthlessness)}</strong>
			</div>
			<div>
				<span>Poll</span>
				<strong>{poll.share}% <span class="uncertain">&plusmn;{poll.margin}</span></strong>
			</div>
		</section>
	{/if}

	{#if phase !== 'offers' && Object.keys(game.positions).length > 0}
		<section class="position-strip" aria-live="polite" aria-label="Candidate public positions">
			<strong>Candidate's public position</strong>
			{#each Object.entries(game.positions) as [issue, position] (issue)}
				<p><span>{issue}</span><span>{position}</span></p>
			{/each}
		</section>
	{/if}

	{#if phase === 'briefing'}
		<div class="card">
			<h2>Your new client</h2>
			<h3>{contract.candidateName}</h3>
			<p>{contract.candidateBlurb}</p>
			<h3>The contract</h3>
			<ul class="objectives">
				{#each contract.objectives as objective (objective.id)}
					<li>{objective.label}</li>
				{/each}
				<li>Budget: &pound;{new Intl.NumberFormat('en-GB').format(contract.budget)} over {contract.days} days</li>
				<li>Your fee if you keep the account: {pounds(contract.fee)}</li>
			</ul>
			<p class="hint">
				Miss any objective and you are out of a job. You get one move a day.
			</p>
			<p class="hint">
				Some moves are locked. Your credibility and your reputation for ruthlessness
				decide which ones open up — and they pull in opposite directions.
			</p>
			<button onclick={startCampaign}>Take the job</button>
		</div>

		<div class="card">
			<h3>The electorate</h3>
			{#each groups as group (group.id)}
				<p><strong>{group.name}</strong> — {group.blurb}</p>
			{/each}
		</div>

		{#if !replaying}
			{@render careerSummary()}
		{/if}
	{/if}

	{#if phase === 'offers'}
		{#if outcome}
			<p class="hint">
				Last campaign: {scenarios[outcome.record.scenarioId].contract.seat}, {outcome.election.voteShare}% —
				{outcome.election.sacked ? 'sacked' : 'account kept'}.
			</p>
		{/if}
		{@render offerList()}
		{@render careerSummary()}
	{/if}

	{#if phase === 'day'}
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
			{#each actions as action (action.id)}
				{@const locks = unmetRequirements(game, action)}
				{@const forecast = forecastAction(game, active, action, action.targeted ? target : undefined)}
				<button
					class="action"
					class:locked={locks.length > 0}
					disabled={
						!canAfford(game, action) ||
						locks.length > 0 ||
						(Boolean(action.pollMargin) && game.day >= contract.days)
					}
					onclick={() => take(action.id, action.targeted)}
				>
					<span>
						<strong>{action.name}{action.targeted ? ` → ${groupName(target)}` : ''}</strong>
						<em>{action.description}</em>
						{#if forecast}
							<em class="forecast">Projected vote share: {forecast.share}% &plusmn;{forecast.margin}</em>
						{/if}
						{#if action.pollMargin && game.day >= contract.days}
							<em class="lock">No campaign day remains to use the results</em>
						{/if}
						{#each locks as lock (lock.stat)}
							<em class="lock">🔒 {lock.label}</em>
						{/each}
					</span>
					<span class="cost">
						{action.cost === 0 ? 'Free' : `£${new Intl.NumberFormat('en-GB').format(action.cost)}`}
					</span>
				</button>
			{/each}
		</div>
	{/if}

	{#if phase === 'feedback' && last}
		<p class="flavour">{last.flavour}</p>

		{#if last.feedback.length > 0}
			<ul class="feedback">
				{#each last.feedback as line, i (i)}
					<li>
						<span>
							{line.label}
							{#if !line.certain}<span class="uncertain">— you won't know until election night</span>{/if}
						</span>
						<span class="delta {line.delta > 0 ? 'up' : 'down'}">
							{formatDelta(line)}
						</span>
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

		<button onclick={advance}>Continue</button>
	{/if}

	{#if phase === 'event' && pendingEvent}
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
					<button class="action" onclick={() => respond(i)}>
						<span>
							<strong>{response.label}</strong>
							{#if response.hint}<em>{response.hint}</em>{/if}
						</span>
					</button>
				{/each}
			</div>
		</section>
	{/if}

	{#if phase === 'election' && election}
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
			{#if outcome}
				<ul class="feedback">
					<li>
						<span>Fee</span>
						<span class="delta {outcome.feeEarned > 0 ? 'up' : 'down'}">{pounds(outcome.feeEarned)}</span>
					</li>
					<li>
						<span>Recognition</span>
						<span class="delta {outcome.recognitionDelta >= 0 ? 'up' : 'down'}">{sign(outcome.recognitionDelta)}</span>
					</li>
				</ul>
			{/if}
		</div>

		<div class="row">
			<button class="ghost" onclick={copyLink}>
				{copied ? 'Link copied' : 'Copy shareable run link'}
			</button>
		</div>
		<p class="hint">The link replays this exact campaign, gaffes and all.</p>

		{#if !replaying}
			{@render offerList()}
			{@render careerSummary()}
		{/if}
	{/if}
</main>
