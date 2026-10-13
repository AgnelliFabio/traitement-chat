// Tout ce qui touche aux dates et heures, TOUJOURS calculé à l'heure de Paris.
// (Le serveur Vercel tourne en UTC : sans ça, « aujourd'hui » serait faux
// entre minuit et 2h du matin, et « 7h » serait en fait 9h.)
//
// Les dates sont manipulées sous forme de texte « AAAA-MM-JJ », comme dans la base.

import type { Slot } from "./labels";

const TZ = "Europe/Paris";

// Découpe un instant en morceaux (année, mois, jour, heure, minute) à l'heure de Paris.
function parisParts(instant: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

export type ParisNow = { date: string; hour: number; minute: number };

// « Maintenant » à Paris : { date: "2026-10-13", hour: 19, minute: 4 }
export function parisNow(): ParisNow {
  return parisParts(new Date());
}

// Ajoute (ou retire) des jours à une date « AAAA-MM-JJ ».
export function addDays(date: string, days: number): string {
  // On se place à midi UTC pour ne jamais tomber à cheval sur deux jours.
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Nombre de jours entre deux dates (positif si `to` est après `from`).
function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`);
  return Math.round(ms / 86_400_000);
}

function weekday(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`)
  );
}

// Date courte : « mar. 13 oct. »
export function shortDate(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Date longue : « Lundi 12 octobre »
export function longDate(date: string): string {
  return capitalize(
    new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    }).format(new Date(`${date}T12:00:00Z`))
  );
}

// Mois abrégé : « oct. »
export function shortMonth(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`)
  );
}

// Le lundi de la semaine qui contient `date`.
export function mondayOf(date: string): string {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay(); // 0 = dimanche, 1 = lundi…
  return addDays(date, -((weekday + 6) % 7));
}

// Nom d'un créneau par rapport à aujourd'hui :
// « ce matin », « ce soir », « demain soir », « hier matin », « jeudi soir »…
export function slotLabel(date: string, slot: Slot, today: string): string {
  const diff = daysBetween(today, date);
  if (diff === 0) return slot === "matin" ? "ce matin" : "ce soir";
  if (diff === 1) return `demain ${slot}`;
  if (diff === -1) return `hier ${slot}`;
  if (diff > 1 && diff < 7) return `${weekday(date)} ${slot}`;
  return `${shortDate(date)} ${slot}`;
}

// « le traitement du soir », « …d'hier soir », « …de demain matin »
export function treatmentOf(date: string, slot: Slot, today: string): string {
  const diff = daysBetween(today, date);
  if (diff === 0) return `du ${slot}`;
  if (diff === -1) return `d'hier ${slot}`;
  return `de ${slotLabel(date, slot, today)}`;
}

// Heure d'un instant enregistré en base, à l'heure de Paris : « 19h04 »
export function formatTime(iso: string): string {
  const { hour, minute } = parisParts(new Date(iso));
  return `${hour}h${String(minute).padStart(2, "0")}`;
}

// « à l'instant », « il y a 5 min », « il y a 3 h », « il y a 2 j »
export function timeAgo(iso: string, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.floor(hours / 24)} j`;
}

// Clé qui permet de trier / comparer des créneaux : « 2026-10-13-0 » (matin) < « 2026-10-13-1 » (soir).
export function slotOrder(date: string, slot: Slot): string {
  return `${date}-${slot === "matin" ? 0 : 1}`;
}

// Le « prochain traitement » à afficher en grand :
// - le matin du jour s'il n'est pas fait et qu'il est avant 13h ;
// - sinon le soir du jour s'il n'est pas fait ;
// - sinon le matin du lendemain.
export function pickNextTreatment<T extends { date: string; slot: Slot; done: object | null }>(
  treatments: T[],
  now: ParisNow
): T | undefined {
  const find = (date: string, slot: Slot) =>
    treatments.find((t) => t.date === date && t.slot === slot);

  const morning = find(now.date, "matin");
  if (morning && !morning.done && now.hour < 13) return morning;

  const evening = find(now.date, "soir");
  if (evening && !evening.done) return evening;

  return find(addDays(now.date, 1), "matin");
}
