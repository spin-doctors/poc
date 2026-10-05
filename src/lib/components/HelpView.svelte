<script lang="ts">
	interface Props {
		onBack: () => void;
	}

	let { onBack }: Props = $props();
</script>

<p class="dateline">How to play</p>

<div class="row nav">
	<button class="ghost" onclick={onBack}>&larr; Back to the game</button>
</div>

<div class="card">
	<h3>The job</h3>
	<p>
		You are not the candidate. You are the spin doctor they hired. Each contract comes with
		objectives; hit them on election night or you are out of a job.
	</p>
</div>

<div class="card">
	<h3>Each day</h3>
	<p>
		Make one move: canvass, stage a photo op, buy media, run an attack ad, prep the candidate or
		commission a poll. Some days a story breaks instead, and you choose how to handle it.
	</p>
</div>

<div class="card">
	<h3>What to watch</h3>
	<p>
		<strong>Budget</strong> pays for most moves; at least one move is always free.
		<strong>Morale</strong> is the candidate's; grind it down and they go off-script.
		<strong>Polls</strong> come with a margin of error, and it is not decorative.
	</p>
</div>

<div class="card">
	<h3>Your reputation</h3>
	<p>
		Honest graft raises <strong>credibility</strong>; dirty tricks raise
		<strong>ruthlessness</strong> and burn credibility. Each unlocks its own moves, and locked moves
		show what they need.
	</p>
</div>
