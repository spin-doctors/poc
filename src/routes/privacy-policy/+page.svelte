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

	<p><strong>Effective date:</strong> October 5, 2026</p>

	<p>
		This policy describes how the Spin Doctors game handles information when you play on the web or
		in the iOS app. The game is a single-player experience. It does not require an account, and it has
		no game server or database.
	</p>

	<h2>Game saves</h2>
	<p>
		Your career progress and welcome-screen preference are stored in the browser storage used by the
		game. In the iOS app, this storage belongs to the app's WebView and is separate from Safari and
		other installations. Saves are not uploaded to a Spin Doctors server. They remain on the device
		until you clear the app's website data or uninstall the app; removing the game may remove its
		local saves.
	</p>

	<h2>Analytics</h2>
	<p>
		Analytics are optional and are disabled unless the deployment is configured with a GoatCounter
		analytics site. When enabled, the game sends page views and fixed event labels such as starting a
		campaign, playing a move, answering an event, advancing a day, or restarting a career. These
		events do not include campaign choices, targets, company profile text, or the contents of a save.
	</p>
	<p>
		Analytics are provided by <a href="https://www.goatcounter.com/">GoatCounter</a>. GoatCounter's
		<a href="https://www.goatcounter.com/help/privacy">privacy policy</a> explains the technical
		information it processes for aggregate statistics, including browser, operating system, coarse
		location, language, screen width, and referrer information. GoatCounter states that it does not
		store IP addresses, full user-agent headers, or browser identifiers in its database, and does not
		use cookies or browser storage for analytics. Its processing is governed by its own policy.
	</p>

	<h2>Hosting and network requests</h2>
	<p>
		The web version is hosted by GitHub Pages. The iOS app bundles the game and can be played offline;
		if analytics are enabled, the app makes network requests to GoatCounter when analytics events are
		recorded. GitHub and GoatCounter process connection information according to their own privacy
		policies.
	</p>

	<h2>Your choices</h2>
	<p>
		You can play without analytics when the deployment has not enabled GoatCounter. You can remove
		locally stored game data by clearing the app's website data or uninstalling the iOS app. Clearing
		browser site data removes web saves.
	</p>

	<h2>Changes and contact</h2>
	<p>
		This policy may be updated when the game or its data practices change. Questions can be raised in
		the <a href="https://github.com/spin-doctors/poc/issues">Spin Doctors GitHub issue tracker</a>.
		It is public, so do not include personal or sensitive information in an issue.
	</p>
</main>