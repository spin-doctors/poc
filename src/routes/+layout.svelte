<script lang="ts">
	import { onMount } from 'svelte';
	import { version } from '$app/environment';
	import { initAnalytics } from '$lib/analytics';
	import '../app.css';

	let { children } = $props();

	const commitUrl: string = import.meta.env.PUBLIC_COMMIT_URL ?? '';

	onMount(initAnalytics);
</script>

{@render children()}

<footer class="build-version">
	{#if commitUrl}
		<a href={commitUrl} target="_blank" rel="noopener noreferrer">v{version}</a>
	{:else}
		v{version}
	{/if}
</footer>
