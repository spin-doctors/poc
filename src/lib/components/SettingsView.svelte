<script lang="ts">
	import type { GameSettings } from '$lib/settings';

	interface Props {
		settings: GameSettings;
		soloCareer: boolean;
		onChange: (settings: GameSettings) => void;
		onNewCareer: () => void;
		onBack: () => void;
	}

	let { settings, soloCareer, onChange, onNewCareer, onBack }: Props = $props();
</script>

<p class="dateline">Settings</p>

<div class="row nav">
	<button class="ghost" onclick={onBack}>&larr; Back to the game</button>
</div>

<div class="card">
	<h3>Playtest</h3>
	<label class="toggle">
		<input
			type="checkbox"
			checked={settings.experimental}
			onchange={(event) => onChange({ ...settings, experimental: event.currentTarget.checked })}
		/>
		Enable experimental features
	</label>
	<p class="hint">
		Adds work in progress that is not part of the core game yet: the multi-account dashboard, where
		you pick your own clients, incorporate a company and hire staff from <em>Career &amp; company</em>
		in the menu.
	</p>
	{#if !soloCareer}
		<p class="hint">
			This career already runs a company or several accounts, so it stays on the dashboard until you
			start a new career.
		</p>
	{/if}
</div>

<div class="card">
	<h3>Save</h3>
	<p class="hint">Walk away from everything and start again from nothing.</p>
	<button class="ghost" onclick={onNewCareer}>Start a new career</button>
</div>

<style>
	.toggle {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		font-weight: 600;
	}
</style>
