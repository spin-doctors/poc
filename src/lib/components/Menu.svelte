<script lang="ts" module>
	export type MenuDestination = 'career' | 'help' | 'settings';
</script>

<script lang="ts">
	interface Props {
		open: boolean;
		experimental: boolean;
		onSelect: (destination: MenuDestination) => void;
	}

	let { open = $bindable(), experimental, onSelect }: Props = $props();

	const feedbackUrl = 'https://github.com/spin-doctors/poc/issues/new';

	let root = $state<HTMLElement>();

	function choose(destination: MenuDestination) {
		open = false;
		onSelect(destination);
	}

	function onWindowClick(event: MouseEvent) {
		if (open && root && !root.contains(event.target as Node)) open = false;
	}

	function onWindowKeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape') open = false;
	}
</script>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

<div class="menu" bind:this={root}>
	<button
		class="ghost toggle"
		aria-label={open ? 'Close menu' : 'Open menu'}
		aria-expanded={open}
		aria-controls="game-menu"
		onclick={() => (open = !open)}
	>
		<span class="bars" aria-hidden="true"></span>
	</button>
	{#if open}
		<nav id="game-menu" aria-label="Game menu">
			<ul>
				{#if experimental}
					<li><button class="ghost" onclick={() => choose('career')}>Career &amp; company</button></li>
				{/if}
				<li><button class="ghost" onclick={() => choose('help')}>How to play</button></li>
				<li>
					<a
						href={feedbackUrl}
						target="_blank"
						rel="noopener noreferrer"
						onclick={() => (open = false)}>Send feedback</a
					>
				</li>
				<li><button class="ghost" onclick={() => choose('settings')}>Settings</button></li>
			</ul>
		</nav>
	{/if}
</div>

<style>
	.menu {
		position: relative;
	}

	.toggle {
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		padding: 0;
	}

	.bars,
	.bars::before,
	.bars::after {
		display: block;
		width: 1.1rem;
		height: 2px;
		background: currentColor;
	}

	.bars {
		position: relative;
	}

	.bars::before,
	.bars::after {
		content: '';
		position: absolute;
		left: 0;
	}

	.bars::before {
		top: -6px;
	}

	.bars::after {
		top: 6px;
	}

	nav {
		position: absolute;
		top: calc(100% + 0.35rem);
		right: 0;
		z-index: 10;
		min-width: 12rem;
		background: var(--paper);
		border: 1px solid var(--ink);
		box-shadow: 4px 4px 0 var(--rule);
	}

	ul {
		margin: 0;
		padding: 0.25rem 0;
		list-style: none;
	}

	li button,
	li a {
		display: block;
		width: 100%;
		padding: 0.6rem 1rem;
		border: 0;
		background: none;
		color: var(--ink);
		font: inherit;
		text-align: left;
		text-decoration: none;
	}

	li button:hover,
	li a:hover {
		background: var(--rule);
	}
</style>
