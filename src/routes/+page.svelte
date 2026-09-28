<script lang="ts">
	import { onMount } from 'svelte';
	import { content } from '$lib/content';
	import { decodeRun, encodeRun } from '$lib/share';
	import {
		applyMove,
		canAfford,
		createGame,
		forecastAction,
		isUnlocked,
		pollEstimate,
		runElection,
		unmetRequirements
	} from '$lib/sim/engine';
	import type { ElectionResult, FeedbackLine, GameState, MoveResult } from '$lib/sim/types';

	type Phase = 'briefing' | 'day' | 'feedback' | 'event' | 'election';

	const { contract, groups, actions, events } = content;

	function freshCampaign() {
		const newSeed = Math.floor(Math.random() * 2 ** 31);
		return { seed: newSeed, game: createGame(content, newSeed) };
	}

	const initial = freshCampaign();
	let seed = $state(initial.seed);
	let game = $state<GameState>(initial.game);
	let phase = $state<Phase>('briefing');
	let last = $state<MoveResult | null>(null);
	let election = $state<ElectionResult | null>(null);
	let target = $state(groups[0].id);
	let copied = $state(false);

	const poll = $derived(pollEstimate(game, content));
	const commissionedPoll = $derived(
		game.pollReport?.availableOnDay === game.day ? game.pollReport : null
	);
	const pendingEvent = $derived(events.find((e) => e.id === game.pendingEventId) ?? null);
	const money = $derived(new Intl.NumberFormat('en-GB').format(game.money));

	onMount(() => {
		const code = new URLSearchParams(window.location.search).get('r');
		if (!code) return;
		const run = decodeRun(code);
		if (!run) return;
		try {
			let restored = createGame(content, run.seed);
			for (const move of run.moves) restored = applyMove(restored, content, move).state;
			seed = run.seed;
			game = restored;
			if (restored.finished) {
				election = runElection(restored, content);
				phase = 'election';
			} else {
				phase = restored.pendingEventId ? 'event' : 'day';
			}
		} catch {
			// A corrupt link just starts a fresh campaign.
		}
	});

	function take(actionId: string, targeted: boolean) {
		last = applyMove(game, content, {
			kind: 'action',
			actionId,
			target: targeted ? target : undefined
		});
		game = last.state;
		phase = 'feedback';
	}

	function respond(index: number) {
		if (!pendingEvent) return;
		last = applyMove(game, content, {
			kind: 'respond',
			eventId: pendingEvent.id,
			responseIndex: index
		});
		game = last.state;
		phase = 'feedback';
	}

	function advance() {
		if (game.pendingEventId) phase = 'event';
		else if (game.finished) {
			election = runElection(game, content);
			phase = 'election';
		} else phase = 'day';
	}

	function restart() {
		const next = freshCampaign();
		seed = next.seed;
		game = next.game;
		last = null;
		election = null;
		copied = false;
		phase = 'briefing';
		history.replaceState(null, '', window.location.pathname);
	}

	async function copyLink() {
		const code = encodeRun({ seed, moves: game.history });
		const url = `${window.location.origin}${window.location.pathname}?r=${code}`;
		await navigator.clipboard.writeText(url);
		copied = true;
	}

	const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
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
		<p>{contract.seat} &middot; by-election</p>
	</header>

	{#if phase !== 'briefing'}
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
			</ul>
			<p class="hint">
				Miss any objective and you are out of a job. You get one move a day.
			</p>
			<p class="hint">
				Some moves are locked. Your credibility and your reputation for ruthlessness
				decide which ones open up — and they pull in opposite directions.
			</p>
			<button onclick={() => (phase = 'day')}>Take the job</button>
		</div>

		<div class="card">
			<h3>The electorate</h3>
			{#each groups as group (group.id)}
				<p><strong>{group.name}</strong> — {group.blurb}</p>
			{/each}
		</div>
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
				{@const forecast = forecastAction(game, content, action, action.targeted ? target : undefined)}
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
			{#if election.sacked}
				<h3>Next season: {contract.nextJob.candidateName}, {contract.nextJob.seat}</h3>
				<p>{contract.nextJob.sting}</p>
			{/if}
		</div>

		<div class="row">
			<button onclick={restart}>New campaign</button>
			<button class="ghost" onclick={copyLink}>
				{copied ? 'Link copied' : 'Copy shareable run link'}
			</button>
		</div>
		<p class="hint">The link replays this exact campaign, gaffes and all.</p>
	{/if}
</main>
