import type { GameSettings } from "$lib/settings";
import { derived, writable } from "svelte/store";

export type Language = GameSettings["language"];

const spanish: Record<string, string> = {
  Settings: "Ajustes",
  "Back to the game": "Volver al juego",
  "Choose a valid reminder time.": "Elige una hora de recordatorio válida.",
  Playtest: "Prueba de juego",
  "Tester: allow immediate day advancement":
    "Prueba: permitir avanzar al día siguiente inmediatamente",
  "Off by default. Normal play advances at local midnight; days away count as idle days. Tester mode pauses automatic advancement and exposes manual next-day controls.":
    "Desactivado de forma predeterminada. En el modo normal, el día avanza a medianoche local; los días sin jugar cuentan como días inactivos. El modo de prueba pausa el avance automático y permite pasar al día siguiente manualmente.",
  "Enable experimental features": "Activar funciones experimentales",
  "Adds work in progress that is not part of the core game yet: the multi-account dashboard, where you pick your own clients, incorporate a company and hire staff from":
    "Añade funciones en desarrollo que todavía no forman parte del juego principal: el panel multicuenta, donde puedes elegir clientes, constituir una empresa y contratar personal desde",
  "Career & company": "Carrera y empresa",
  "This career already runs a company or several accounts, so it stays on the dashboard until you start a new career.":
    "Esta carrera ya gestiona una empresa o varias cuentas, así que seguirá en el panel hasta que empieces una nueva carrera.",
  "Daily reminders": "Recordatorios diarios",
  "Remind me about unfinished campaign actions":
    "Avisarme de las acciones de campaña pendientes",
  "Daily reminder time (local time)":
    "Hora del recordatorio diario (hora local)",
  "09:00 by default. Days still open at midnight. A reminder is sent only if a normal move or event response remains in any account; an optional poll alone does not count. Election results get a separate reminder.":
    "La hora predeterminada es 09:00. El día sigue abierto hasta medianoche. Solo se envía un recordatorio si queda una acción normal o una respuesta a un evento pendiente en alguna cuenta; una encuesta opcional no cuenta. Los resultados electorales tienen su propio recordatorio.",
  "Permission: {permission}. Reminders are scheduled on this device, not sent by a server. They may arrive late; the game’s calendar does not wait for them.":
    "Permiso: {permission}. Los recordatorios se programan en este dispositivo; no los envía un servidor. Pueden llegar tarde: el calendario del juego no espera.",
  "Enable notifications in the device’s app settings, then return here.":
    "Activa las notificaciones en los ajustes de la aplicación del dispositivo y vuelve aquí.",
  "Available in the iOS and Android apps only.":
    "Disponible solo en las aplicaciones para iOS y Android.",
  "Reminders are paused in tester mode.":
    "Los recordatorios están pausados en el modo de prueba.",
  Save: "Guardar",
  "Walk away from everything and start again from nothing.":
    "Déjalo todo y vuelve a empezar desde cero.",
  "Start a new career": "Empezar una nueva carrera",
  Language: "Idioma",
  English: "Inglés",
  Spanish: "Español",
  "in the menu.": "en el menú.",
  granted: "concedido",
  denied: "denegado",
  prompt: "pendiente",
  unsupported: "no disponible",
  "Could not mark this election result as seen.":
    "No se pudo marcar este resultado electoral como visto.",
  "Could not update daily reminders.":
    "No se pudieron actualizar los recordatorios diarios.",
  "Could not update daily reminders. Check notification permissions in your device settings.":
    "No se pudieron actualizar los recordatorios diarios. Comprueba los permisos de notificación en los ajustes de tu dispositivo.",
  "Special actions now have risk and dismissal outcomes. Your old career has been reset so past moves are not reinterpreted; your settings are preserved.":
    "Las acciones especiales ahora conllevan riesgos y pueden provocar un despido. Tu antigua carrera se ha reiniciado para no reinterpretar las jugadas anteriores; se han conservado tus ajustes.",
  "Could not restore your career. Start a new career from Settings, or check device storage.":
    "No se pudo restaurar tu carrera. Empieza una nueva desde Ajustes o comprueba el almacenamiento del dispositivo.",
  "Could not advance the calendar.": "No se pudo avanzar el calendario.",
  "Could not advance the calendar. Check device storage.":
    "No se pudo avanzar el calendario. Comprueba el almacenamiento del dispositivo.",
  "Could not read notification permissions.":
    "No se pudieron leer los permisos de notificación.",
  "Could not listen for app resume.":
    "No se pudo detectar la reanudación de la aplicación.",
  "Could not handle notification taps.":
    "No se pudieron gestionar los toques en las notificaciones.",
  "A new day has opened. Choose your move again.":
    "Ha comenzado un nuevo día. Vuelve a elegir tu jugada.",
  "Could not accept this client.": "No se pudo aceptar a este cliente.",
  "Could not advance the day.": "No se pudo avanzar el día.",
  "Could not incorporate the company.": "No se pudo constituir la empresa.",
  "Could not hire staff.": "No se pudo contratar personal.",
  "Walk away from this career and start again from nothing?":
    "¿Quieres abandonar esta carrera y volver a empezar desde cero?",
  "Could not save a new career.": "No se pudo guardar la nueva carrera.",
  "Could not save settings.": "No se pudieron guardar los ajustes.",
  "Loading your campaign...": "Cargando tu campaña...",
  "Your phone is ringing...": "Está sonando tu teléfono...",
  "Close menu": "Cerrar el menú",
  "Open menu": "Abrir el menú",
  "Game menu": "Menú del juego",
  "How to play": "Cómo jugar",
  "Send feedback": "Enviar comentarios",
  "The job": "El trabajo",
  "You are not the candidate. You are the spin doctor they hired. Each contract comes with objectives; hit them on election night or you are out of a job.":
    "No eres el candidato. Eres el asesor de imagen que han contratado. Cada contrato incluye objetivos: cúmplelos la noche de las elecciones o te quedarás sin trabajo.",
  "Each day": "Cada día",
  "Make one move: canvass, stage a photo op, buy media, run an attack ad, prep the candidate or throw a distraction. You may also pay for one private poll per account per day without using your move. Some moves trigger a story, and you choose how to handle it.":
    "Haz una jugada: visita a los vecinos, organiza una sesión de fotos, compra espacio en los medios, lanza un anuncio de ataque, prepara al candidato o crea una distracción. También puedes pagar una encuesta privada por cuenta y día sin gastar tu jugada. Algunas jugadas desencadenan una historia y tú decides cómo responder.",
  "Days advance at local midnight, even while you are away. An unfinished day loses 5 morale. After today’s move and any event responses, come back tomorrow. Immediate advancement is a tester option in Settings.":
    "Los días avanzan a medianoche local, aunque no estés jugando. Por cada día sin completar se pierden 5 puntos de moral. Después de hacer la jugada de hoy y responder a los eventos, vuelve mañana. El avance inmediato es una opción de prueba en Ajustes.",
  "The opposition": "La oposición",
  "Doorstep canvassing asks which voter group to visit. Attack ads ask which opponent to attack; gains cannot exceed that opponent’s available support. Other moves are broad.":
    "Al visitar a los vecinos, eliges a qué grupo de votantes visitar. Para los anuncios de ataque, eliges a qué rival atacar; el apoyo que le quites no puede superar el que tenga disponible. Las demás jugadas son generales.",
  "Parliamentary elections also have novelty contenders, including Count Binface and a Monster Raving Loony Party candidate. They attract very few votes and cannot become clients.":
    "En las elecciones parlamentarias también hay candidatos extravagantes, como Count Binface y un candidato del Monster Raving Loony Party. Atraen muy pocos votos y no pueden convertirse en clientes.",
  "Polling and the papers": "Las encuestas y la prensa",
  "A paid poll arrives tomorrow with all candidates’ standings by voter group and action forecasts. Bigger samples cost more and narrow the margin. Old reports remain in your private archive; the forecasts are available only on the delivery day. No new poll can be used after the final day.":
    "Las encuestas pagadas llegan mañana e incluyen la posición de cada candidato por grupo de votantes y previsiones sobre las jugadas. Las muestras grandes cuestan más y reducen el margen de error. Los informes antiguos permanecen en tu archivo privado; las previsiones solo están disponibles el día de entrega. No se pueden encargar encuestas después del último día.",
  "The newspaper covers public polling, stories and gaffes. Paid polling stays private. Native iOS and Android reminders are optional and may be delayed; the calendar works without them. Choose a local reminder time in Settings (09:00 by default). You are reminded only about unfinished normal moves or event responses, not optional polls. Election results get a separate reminder.":
    "El periódico informa sobre encuestas públicas, historias y meteduras de pata. Las encuestas pagadas son privadas. Los recordatorios opcionales de iOS y Android pueden retrasarse; el calendario funciona sin ellos. Elige una hora local para los recordatorios en Ajustes (09:00 de forma predeterminada). Solo recibirás avisos por jugadas normales o respuestas a eventos pendientes, no por encuestas opcionales. Los resultados electorales tienen un recordatorio aparte.",
  "Required goals and bonuses": "Objetivos obligatorios y bonificaciones",
  "Only required objectives decide whether you keep the account. Optional objectives pay extra funds and recognition, but only if you keep the job. Council clients offer a bonus for winning; Harwell expects to win and offers a bonus for exceeding 50% of votes.":
    "Solo los objetivos obligatorios determinan si conservas la cuenta. Los objetivos opcionales dan fondos y reconocimiento adicionales, pero solo si conservas el trabajo. Los clientes municipales ofrecen una bonificación por ganar; Harwell espera ganar y ofrece una bonificación por superar el 50 % de los votos.",
  "First past the post means beating every opponent, not necessarily winning a majority. A tied lead is not a win, and exactly 50% does not earn the majority bonus.":
    "Ganar por mayoría simple significa superar a todos los rivales, no necesariamente obtener la mayoría absoluta. Un empate en cabeza no es una victoria y obtener exactamente el 50 % no da derecho a la bonificación por mayoría.",
  "What to watch": "En qué fijarse",
  Budget: "Presupuesto",
  "pays for most moves; at least one move is always free.":
    "paga la mayoría de las jugadas; siempre hay al menos una gratuita.",
  Morale: "Moral",
  "is the candidate’s; grind it down and they go off-script.":
    "es la del candidato; si baja demasiado, se saldrá del guion.",
  Polls: "Encuestas",
  "come with a margin of error, and it is not decorative.":
    "incluyen un margen de error, y no está de adorno.",
  "Your reputation": "Tu reputación",
  "Honest graft raises": "El trabajo honrado aumenta la",
  credibility: "credibilidad",
  "dirty tricks raise": "las malas artes aumentan la",
  ruthlessness: "implacabilidad",
  "and burn credibility. Each unlocks its own moves, and locked moves show what they need.":
    "y desgastan la credibilidad. Cada atributo desbloquea sus propias jugadas; las jugadas bloqueadas indican qué necesitan.",
  "Specials have three tracks: credibility, ruthlessness and personal funds. Each shows unlocked moves and only its next locked move. Unlocks use your current stats: spending credibility can lock a move again.":
    "Las acciones especiales tienen tres categorías: credibilidad, implacabilidad y fondos personales. Cada una muestra las jugadas desbloqueadas y solo la siguiente jugada bloqueada. Los desbloqueos dependen de tus atributos actuales: gastar credibilidad puede volver a bloquear una jugada.",
  "Credibility specials spend a small percentage of your reputation on every attempt. A failed special also costs a percentage of your pre-attempt credibility. Before committing, review the exact costs, conditional rewards and failure risks; cancelling spends nothing.":
    "Cada intento de una acción especial de credibilidad consume un pequeño porcentaje de tu reputación. Si falla, también pierdes un porcentaje de tu credibilidad anterior al intento. Antes de comprometerte, revisa los costes exactos, las recompensas condicionales y los riesgos; cancelar no cuesta nada.",
  "Ruthless specials can be caught and can get you thrown under the bus. This ends that account immediately and forfeits fees and bonuses, but your career and other accounts continue. Ordinary election-night sackings still lead down the fallback-client ladder.":
    "Las acciones especiales implacables pueden descubrirse y hacer que te sacrifiquen. La cuenta termina inmediatamente y pierdes los honorarios y las bonificaciones, pero tu carrera y las demás cuentas continúan. Los despidos normales la noche electoral aún te permiten seguir con los clientes de reemplazo.",
  "At ruthlessness 75 and 85, fictional parliamentary patrons Vale and Voss become available. They tolerate underhand tactics, reducing dismissal risk without eliminating it.":
    "Con 75 y 85 puntos de implacabilidad, podrás trabajar para los ficticios patrocinadores parlamentarios Vale y Voss. Toleran las tácticas turbias y reducen el riesgo de despido, pero no lo eliminan.",
  "Story waiting": "Historia pendiente",
  "Done for today": "Día terminado",
  "Needs a move": "Necesita una jugada",
  "Day {day}": "Día {day}",
  "Freelance operator": "Asesor independiente",
  "Company cash": "Fondos de la empresa",
  "Your funds": "Tus fondos",
  Credibility: "Credibilidad",
  Ruthlessness: "Implacabilidad",
  Recognition: "Reconocimiento",
  Accounts: "Cuentas",
  "Active accounts": "Cuentas activas",
  "No clients on the books. Take a job from the offers below.":
    "No tienes clientes. Acepta uno de los trabajos disponibles.",
  Client: "Cliente",
  Day: "Día",
  Poll: "Encuesta",
  Today: "Hoy",
  "Polls tonight": "Encuestas esta noche",
  Open: "Abrir",
  "The calendar": "El calendario",
  "The next day opens at {time}.": "El próximo día empieza a las {time}.",
  "One account still has no move today and will lose {penalty} morale.":
    "Una cuenta aún no ha hecho su jugada de hoy y perderá {penalty} puntos de moral.",
  "{count} accounts still have no move today and will lose {penalty} morale.":
    "{count} cuentas aún no han hecho su jugada de hoy y perderán {penalty} puntos de moral.",
  "Tester: simulate next day": "Prueba: simular el día siguiente",
  Results: "Resultados",
  Called: "Fecha",
  Share: "Porcentaje",
  Verdict: "Veredicto",
  New: "Nuevo",
  "No count — dismissed early": "Sin recuento: despido anticipado",
  "Thrown under the bus": "Te han sacrificado",
  Sacked: "Despedido",
  Kept: "Conservado",
  "Election night": "Noche electoral",
  "Who's calling": "¿Quién llama?",
  "{days} days, {budget} campaign budget":
    "{days} días, presupuesto de campaña de {budget}",
  "You are already running this campaign": "Ya estás gestionando esta campaña",
  "Every staffer is busy — hire more from company management":
    "Todo el personal está ocupado: contrata a alguien más desde la gestión de la empresa",
  "You can only run one account alone — incorporate and hire staff":
    "Solo puedes gestionar una cuenta por tu cuenta: constituye una empresa y contrata personal",
  "Fee {fee}": "Honorarios {fee}",
};

export const language = writable<Language>("en");

export const t = derived(language, (currentLanguage) => {
  return (source: string, values: Record<string, string | number> = {}) => {
    const message =
      currentLanguage === "es" ? (spanish[source] ?? source) : source;
    return message.replace(/\{(\w+)\}/g, (_, key: string) =>
      String(values[key] ?? `{${key}}`),
    );
  };
});

export function setLanguage(nextLanguage: Language): void {
  language.set(nextLanguage);
}

export function translate(source: string, currentLanguage: Language): string {
  return currentLanguage === "es" ? (spanish[source] ?? source) : source;
}
