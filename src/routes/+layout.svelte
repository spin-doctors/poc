<script lang="ts">
	import { onMount } from 'svelte';
	import { version } from '$app/environment';
	import { base } from '$app/paths';
	import { initAnalytics } from '$lib/analytics';
	import { initAndroidNavigation } from '$lib/androidNavigation';
	import '../app.css';

	let { children } = $props();

	const commitUrl: string = import.meta.env.PUBLIC_COMMIT_URL ?? '';

	onMount(initAnalytics);
	onMount(() => {
		const listener = initAndroidNavigation().catch((error: unknown) => {
			console.error('Could not initialize Android Back navigation.', error);
		});
		return () => {
			void listener.then((handle) => handle?.remove()).catch((error: unknown) => {
				console.error('Could not remove Android Back navigation.', error);
			});
		};
	});
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
