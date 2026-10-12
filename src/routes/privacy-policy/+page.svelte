<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { Capacitor } from '@capacitor/core';

	let externalTarget = $state('_blank');
	onMount(() => { if (Capacitor.isNativePlatform()) externalTarget = '_self'; });
</script>

<svelte:head>
	<title>Privacy Policy | Spin Doctors</title>
	<meta
		name="description"
		content="Privacy information for the Spin Doctors campaign management game."
	/>
</svelte:head>

<main>
	<header class="masthead">
		<h1>Privacy Policy</h1>
		<p>Spin Doctors</p>
	</header>
	<div class="row nav">
		<a class="ghost" href={`${base}/`}>&larr; Back to the game</a>
	</div>

	<p><strong>Effective date:</strong> October 5, 2026</p>

	<p>
		This policy describes how the Spin Doctors game handles information when you play on the web or
		in the iOS or Android app. The game is a single-player experience. It does not require an account, and it has
		no game server or database.
	</p>

	<h2>Game saves</h2>
	<p>
		Your career progress and game settings are stored in the browser storage used by the
		game. In the iOS and Android apps, this storage belongs to the app's WebView and is separate from browsers and
		other installations. Saves are not uploaded to a Spin Doctors server. They remain on the device
		until you clear the app's website data or uninstall the app; removing the game may remove its
		local saves.
	</p>
	<p>
		The Android app disables Android cloud backup and device-to-device transfer of app data.
		There is no cloud save or automatic transfer between the web, iOS and Android versions.
		Clearing Android app storage or uninstalling the app removes its saves.
	</p>

	<h2>Analytics</h2>
	<p>
		Analytics are optional and are disabled unless the deployment is configured with a GoatCounter
		analytics site. When enabled, the game sends page views and fixed event labels such as starting a
		campaign, playing a move, answering an event, advancing a day, or restarting a career. These
		events do not include campaign choices, targets, company profile text, or the contents of a save.
		Whether analytics are enabled is a build configuration choice, not an in-game opt-in setting.
	</p>
	<p>
		Analytics are provided by <a href="https://www.goatcounter.com/" target={externalTarget} rel="noopener noreferrer">GoatCounter</a>. GoatCounter's
		<a href="https://www.goatcounter.com/help/privacy" target={externalTarget} rel="noopener noreferrer">privacy policy</a> explains the technical
		information it processes for aggregate statistics, including browser, operating system, coarse
		location, language, screen width, and referrer information. GoatCounter states that it does not
		store IP addresses, full user-agent headers, or browser identifiers in its database, and does not
		use cookies or browser storage for analytics. Its processing is governed by its own policy.
	</p>

	<h2>Hosting and network requests</h2>
	<p>
		The web version is hosted by GitHub Pages. The iOS and Android apps bundle the game and can be played offline;
		if analytics are enabled, the app makes network requests to GoatCounter when analytics events are
		recorded. GitHub and GoatCounter process connection information according to their own privacy
		policies.
	</p>

	<h2>Local notifications</h2>
	<p>
		The iOS and Android apps can schedule daily reminders on your device if you enable them in
		Settings and grant notification permission. These are local notifications, not server-sent push
		messages. No push token or career data is sent to a game server. You can disable reminders in
		the game or revoke permission in your device settings. Notification delivery may be delayed;
		game progress is calculated from the local calendar when you return.
		You can choose a local reminder time (09:00 by default). Daily action reminders are cancelled
		when all normal moves and event responses are finished; optional polling alone does not trigger
		a reminder. Election results receive a separate reminder.
	</p>
	<h2>Your choices</h2>
	<p>
		You can play without analytics when the deployment has not enabled GoatCounter. You can remove
		locally stored game data by clearing the app's website data, clearing Android app storage, or uninstalling a native app. Clearing
		browser site data removes web saves.
	</p>

	<h2>Changes and contact</h2>
	<p>
		This policy may be updated when the game or its data practices change. Questions can be raised in
		the <a href="https://github.com/spin-doctors/poc/issues" target={externalTarget} rel="noopener noreferrer">Spin Doctors GitHub issue tracker</a>.
		It is public, so do not include personal or sensitive information in an issue.
	</p>
	<div class="row nav">
		<a class="ghost" href={`${base}/`}>&larr; Back to the game</a>
	</div>
</main>