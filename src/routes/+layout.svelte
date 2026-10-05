<script lang="ts">
	import { onMount } from 'svelte';
	import { version } from '$app/environment';
		import { base } from '$app/paths';
	import { initAnalytics } from '$lib/analytics';
	import '../app.css';

	let { children } = $props();

	const commitUrl: string = import.meta.env.PUBLIC_COMMIT_URL ?? '';

	onMount(initAnalytics);
</script>

{@render children()}

<footer class="build-version">
	<a class="privacy-link" href={`${base}/privacy-policy/`}>Privacy Policy</a>
	{#if commitUrl}
		<a href={commitUrl} target="_blank" rel="noopener noreferrer">v{version}</a>
	{:else}
		v{version}
	{/if}
</footer>
