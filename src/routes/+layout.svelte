<script lang="ts">
	import { onMount } from 'svelte';
	import { initAnalytics } from '$lib/analytics';
	import '../app.css';

	let { children } = $props();

	onMount(initAnalytics);
</script>

{@render children()}
