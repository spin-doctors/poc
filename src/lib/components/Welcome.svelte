<script lang="ts">
	interface Props {
		onContinue: () => void;
	}

	let { onContinue }: Props = $props();
</script>

<section class="welcome" aria-labelledby="welcome-title">
	<p class="eyebrow">First briefing</p>
	<h2 id="welcome-title">Welcome to Spin Doctors</h2>
	<p>
		You’re a freelance political campaign manager, hired to help candidates win. Every move has
		consequences for the campaign, your reputation, and your career.
	</p>
	<aside class="playtest-note" aria-label="Play-test note">
		<strong>Play-test note</strong>
		<p>
			Days advance manually with “Simulate next day”; accounts without a move lose 5 morale. This is a
			prototype, so feedback on what feels confusing or enjoyable is welcome.
		</p>
	</aside>
	<button onclick={onContinue}>Enter the dashboard</button>
</section>

<style>
	.welcome {
		max-width: 40rem;
		padding: 1.25rem 0 1.5rem;
	}

	.eyebrow {
		margin: 0 0 0.5rem;
		color: var(--muted);
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	h2 {
		margin: 0 0 0.75rem;
		font-size: 1.65rem;
		line-height: 1.15;
	}

	.welcome > p:not(.eyebrow) {
		max-width: 36rem;
		margin: 0 0 1.25rem;
		font-size: 1.08rem;
	}

	.playtest-note {
		margin: 0 0 1.25rem;
		padding: 0.15rem 0 0.15rem 1rem;
		border-left: 3px solid var(--accent);
	}

	.playtest-note strong {
		display: block;
		margin-bottom: 0.2rem;
	}

	.playtest-note p {
		margin: 0;
		color: var(--muted);
	}
</style>