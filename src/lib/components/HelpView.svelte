<script lang="ts">
	import { t } from '$lib/i18n';

	interface Props {
		onBack: () => void;
	}

	let { onBack }: Props = $props();
</script>

<p class="dateline">{$t('How to play')}</p>

<div class="row nav">
	<button class="ghost" onclick={onBack}>&larr; {$t('Back to the game')}</button>
</div>

<div class="card">
	<h3>{$t('The job')}</h3>
	<p>
		{$t('You are not the candidate. You are the spin doctor they hired. Each contract comes with objectives; hit them on election night or you are out of a job.')}
	</p>
</div>

<div class="card">
	<h3>{$t('Each day')}</h3>
	<p>
		{$t('Make one move: canvass, stage a photo op, buy media, run an attack ad, prep the candidate or throw a distraction. You may also pay for one private poll per account per day without using your move. Some moves trigger a story, and you choose how to handle it.')}
	</p>
	<p>{$t('Days advance at local midnight, even while you are away. An unfinished day loses 5 morale. After today’s move and any event responses, come back tomorrow. Immediate advancement is a tester option in Settings.')}</p>
</div>

<div class="card">
	<h3>{$t('The opposition')}</h3>
	<p>{$t('Doorstep canvassing asks which voter group to visit. Attack ads ask which opponent to attack; gains cannot exceed that opponent’s available support. Other moves are broad.')}</p>
	<p>{$t('Parliamentary elections also have novelty contenders, including Count Binface and a Monster Raving Loony Party candidate. They attract very few votes and cannot become clients.')}</p>
</div>

<div class="card">
	<h3>{$t('Polling and the papers')}</h3>
	<p>{$t('A paid poll arrives tomorrow with all candidates’ standings by voter group and action forecasts. Bigger samples cost more and narrow the margin. Old reports remain in your private archive; the forecasts are available only on the delivery day. No new poll can be used after the final day.')}</p>
	<p>{$t('The newspaper covers public polling, stories and gaffes. Paid polling stays private. Native iOS and Android reminders are optional and may be delayed; the calendar works without them. Choose a local reminder time in Settings (09:00 by default). You are reminded only about unfinished normal moves or event responses, not optional polls. Election results get a separate reminder.')}</p>
</div>

<div class="card">
	<h3>{$t('Required goals and bonuses')}</h3>
	<p>{$t('Only required objectives decide whether you keep the account. Optional objectives pay extra funds and recognition, but only if you keep the job. Council clients offer a bonus for winning; Harwell expects to win and offers a bonus for exceeding 50% of votes.')}</p>
	<p>{$t('First past the post means beating every opponent, not necessarily winning a majority. A tied lead is not a win, and exactly 50% does not earn the majority bonus.')}</p>
</div>

<div class="card">
	<h3>{$t('What to watch')}</h3>
	<p>
		<strong>{$t('Budget')}</strong> {$t('pays for most moves; at least one move is always free.')}
		<strong>{$t('Morale')}</strong> {$t('is the candidate’s; grind it down and they go off-script.')}
		<strong>{$t('Polls')}</strong> {$t('come with a margin of error, and it is not decorative.')}
	</p>
</div>

<div class="card">
	<h3>{$t('Your reputation')}</h3>
	<p>
		{$t('Honest graft raises')} <strong>{$t('credibility')}</strong>; {$t('dirty tricks raise')}
		<strong>{$t('ruthlessness')}</strong> {$t('and burn credibility. Each unlocks its own moves, and locked moves show what they need.')}
	</p>
	<p>{$t('Specials have three tracks: credibility, ruthlessness and personal funds. Each shows unlocked moves and only its next locked move. Unlocks use your current stats: spending credibility can lock a move again.')}</p>
	<p>{$t('Credibility specials spend a small percentage of your reputation on every attempt. A failed special also costs a percentage of your pre-attempt credibility. Before committing, review the exact costs, conditional rewards and failure risks; cancelling spends nothing.')}</p>
	<p>{$t('Ruthless specials can be caught and can get you thrown under the bus. This ends that account immediately and forfeits fees and bonuses, but your career and other accounts continue. Ordinary election-night sackings still lead down the fallback-client ladder.')}</p>
	<p>{$t('At ruthlessness 75 and 85, fictional parliamentary patrons Vale and Voss become available. They tolerate underhand tactics, reducing dismissal risk without eliminating it.')}</p>
</div>
