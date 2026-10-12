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
		throw a distraction. You may also pay for one private poll per account per day without using
		your move. Some moves trigger a story, and you choose how to handle it.
	</p>
	<p>Days advance at local midnight, even while you are away. An unfinished day loses 5 morale.
		After today’s move and any event responses, come back tomorrow. Immediate advancement is a tester option in Settings.</p>
</div>

<div class="card">
	<h3>The opposition</h3>
	<p>Doorstep canvassing asks which voter group to visit. Attack ads ask which opponent to attack;
		gains cannot exceed that opponent’s available support. Other moves are broad.</p>
	<p>Parliamentary elections also have novelty contenders, including Count Binface and a Monster
		Raving Loony Party candidate. They attract very few votes and cannot become clients.</p>
</div>

<div class="card">
	<h3>Polling and the papers</h3>
	<p>A paid poll arrives tomorrow with all candidates’ standings by voter group and action forecasts.
		Bigger samples cost more and narrow the margin. Old reports remain in your private archive;
		the forecasts are available only on the delivery day. No new poll can be used after the final day.</p>
	<p>The newspaper covers public polling, stories and gaffes. Paid polling stays private.
		Native iOS and Android reminders are optional and may be delayed; the calendar works without them.
		Choose a local reminder time in Settings (09:00 by default). You are reminded only about unfinished
		normal moves or event responses, not optional polls. Election results get a separate reminder.</p>
</div>

<div class="card">
	<h3>Required goals and bonuses</h3>
	<p>Only required objectives decide whether you keep the account. Optional objectives pay extra
		funds and recognition, but only if you keep the job. Council clients offer a bonus for winning;
		Harwell expects to win and offers a bonus for exceeding 50% of votes.</p>
	<p>First past the post means beating every opponent, not necessarily winning a majority.
		A tied lead is not a win, and exactly 50% does not earn the majority bonus.</p>
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
