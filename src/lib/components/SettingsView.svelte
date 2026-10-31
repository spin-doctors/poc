<script lang="ts">
	import type { GameSettings } from '$lib/settings';
	import { t } from '$lib/i18n';

	interface Props {
		settings: GameSettings;
		notificationPermission: string;
		soloCareer: boolean;
		onChange: (settings: GameSettings) => void;
		onNewCareer: () => void;
		onBack: () => void;
	}

	let { settings, notificationPermission, soloCareer, onChange, onNewCareer, onBack }: Props = $props();
	let timeError = $state('');

	function changeReminderTime(event: Event) {
		const input = event.currentTarget;
		if (!(input instanceof HTMLInputElement)) return;
		if (!input.validity.valid || !input.value) {
			timeError = $t('Choose a valid reminder time.');
			input.value = settings.reminderTime;
			return;
		}
		timeError = '';
		onChange({ ...settings, reminderTime: input.value });
	}
</script>

<p class="dateline">{$t('Settings')}</p>

<div class="row nav">
	<button class="ghost" onclick={onBack}>&larr; {$t('Back to the game')}</button>
</div>

<div class="card">
	<h3>{$t('Playtest')}</h3>
	<label class="toggle">
		<input type="checkbox" checked={settings.instantAdvance}
			onchange={(event) => onChange({ ...settings, instantAdvance: event.currentTarget.checked })} />
		{$t('Tester: allow immediate day advancement')}
	</label>
	<p class="hint">{$t('Off by default. Normal play advances at local midnight; days away count as idle days. Tester mode pauses automatic advancement and exposes manual next-day controls.')}</p>
	<label class="toggle">
		<input
			type="checkbox"
			checked={settings.experimental}
			onchange={(event) => onChange({ ...settings, experimental: event.currentTarget.checked })}
		/>
		{$t('Enable experimental features')}
	</label>
	<p class="hint">
		{$t('Adds work in progress that is not part of the core game yet: the multi-account dashboard, where you pick your own clients, incorporate a company and hire staff from')}
		<em>{$t('Career & company')}</em> {$t('in the menu.')}
	</p>
	{#if !soloCareer}
		<p class="hint">
			{$t('This career already runs a company or several accounts, so it stays on the dashboard until you start a new career.')}
		</p>
	{/if}
</div>

<div class="card">
	<h3>{$t('Daily reminders')}</h3>
	<label class="toggle">
		<input type="checkbox" checked={settings.reminders} disabled={notificationPermission === 'unsupported'}
			onchange={(event) => onChange({ ...settings, reminders: event.currentTarget.checked })} />
		{$t('Remind me about unfinished campaign actions')}
	</label>
	<label for="reminder-time">{$t('Daily reminder time (local time)')}</label>
	<input id="reminder-time" type="time" required value={settings.reminderTime}
		disabled={notificationPermission === 'unsupported'} onchange={changeReminderTime}
		aria-describedby="reminder-time-help" />
	{#if timeError}<p role="alert" class="error">{timeError}</p>{/if}
	<p id="reminder-time-help" class="hint">{$t('09:00 by default. Days still open at midnight. A reminder is sent only if a normal move or event response remains in any account; an optional poll alone does not count. Election results get a separate reminder.')}</p>
	<p class="hint">{$t('Permission: {permission}. Reminders are scheduled on this device, not sent by a server. They may arrive late; the game’s calendar does not wait for them.', { permission: $t(notificationPermission) })}</p>
	{#if notificationPermission === 'denied'}<p>{$t('Enable notifications in the device’s app settings, then return here.')}</p>{/if}
	{#if notificationPermission === 'unsupported'}<p>{$t('Available in the iOS and Android apps only.')}</p>{/if}
	{#if settings.instantAdvance}<p>{$t('Reminders are paused in tester mode.')}</p>{/if}
</div>

<div class="card">
	<h3>{$t('Language')}</h3>
	<label for="language">{$t('Language')}</label>
	<select id="language" value={settings.language}
		onchange={(event) => onChange({ ...settings, language: event.currentTarget.value as GameSettings['language'] })}>
		<option value="en">{$t('English')}</option>
		<option value="es">{$t('Spanish')}</option>
	</select>
</div>

<div class="card">
	<h3>{$t('Save')}</h3>
	<p class="hint">{$t('Walk away from everything and start again from nothing.')}</p>
	<button class="ghost" onclick={onNewCareer}>{$t('Start a new career')}</button>
</div>

<style>
	.toggle {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		font-weight: 600;
	}
</style>
