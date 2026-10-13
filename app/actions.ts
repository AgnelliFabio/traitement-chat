"use server";

// Les « Server Actions » : le code qui tourne sur le serveur quand on appuie sur un bouton.
// Chacune : vérifie qui agit (cookie) → contrôle les données reçues → écrit en base →
// note l'action dans l'historique → prévient les autres → rafraîchit la page.

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { notify, notifyMember } from "@/lib/push";
import { clearMemberCookie, getCurrentMember, setMemberCookie } from "@/lib/auth";
import { parisNow, slotLabel, slotOrder, treatmentOf } from "@/lib/time";
import {
  CANCEL_MARKER,
  COMMENT_MAX,
  LOCATION_LABEL,
  type Location,
  type Slot,
  type Status,
} from "@/lib/labels";

export type ActionResult = { error?: string };

const NOT_LOGGED: ActionResult = { error: "Tu n'es plus identifié·e. Recharge la page." };
const SAVE_ERROR: ActionResult = { error: "Impossible d'enregistrer. Réessaie." };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOTIF_TITLE = "🐱 Traitement du chat";

type Treatment = {
  id: string;
  date: string;
  slot: Slot;
  location: Location;
  done_by: string | null;
};

// --- Petits outils ---------------------------------------------------------

// Commentaire : espaces retirés, vide → null. Renvoie false s'il est trop long.
function cleanComment(raw: unknown): string | null | false {
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (text === "") return null;
  // Array.from compte comme PostgreSQL (un emoji = 1 caractère).
  return Array.from(text).length > COMMENT_MAX ? false : text;
}

async function getTreatment(id: unknown): Promise<Treatment | null> {
  if (typeof id !== "string" || !UUID.test(id)) return null;
  const { data } = await supabase
    .from("treatments")
    .select("id, date, slot, location, done_by")
    .eq("id", id)
    .maybeSingle();
  return data;
}

async function log(memberId: string, treatmentId: string, action: string, detail: string | null) {
  await supabase
    .from("activity_log")
    .insert({ member_id: memberId, treatment_id: treatmentId, action, detail });
}

// Envoie la notif aux autres. Une panne de notif ne doit jamais faire échouer l'action.
async function announce(body: string, exceptMemberId: string) {
  try {
    await notify({ title: NOTIF_TITLE, body, url: "/" }, exceptMemberId);
  } catch (err) {
    console.error("Notification non envoyée :", err);
  }
}

const withComment = (text: string, comment: string | null) =>
  comment ? `${text} : ${comment}` : text;

// --- Identification --------------------------------------------------------

export async function login(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const memberId = String(formData.get("memberId") ?? "");
  const code = String(formData.get("code") ?? "").trim();

  if (!UUID.test(memberId)) return { error: "Choisis ton prénom." };
  if (code !== process.env.FAMILY_CODE) {
    // Petite pause pour rendre inutile l'essai de milliers de codes.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { error: "Code famille incorrect." };
  }

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("id", memberId)
    .maybeSingle();
  if (!member) return { error: "Choisis ton prénom." };

  await setMemberCookie(member.id);
  refresh();
  return {};
}

export async function logout() {
  await clearMemberCookie();
  redirect("/"); // retour à l'écran « Qui es-tu ? », même depuis une autre page
}

// --- Dispo / pas dispo -----------------------------------------------------

export async function setAvailability(
  treatmentId: string,
  status: Status,
  rawComment: string
): Promise<ActionResult> {
  const me = await getCurrentMember();
  if (!me) return NOT_LOGGED;
  if (status !== "dispo" && status !== "indispo") return SAVE_ERROR;

  const comment = cleanComment(rawComment);
  if (comment === false) return { error: `${COMMENT_MAX} caractères maximum.` };

  const t = await getTreatment(treatmentId);
  if (!t) return { error: "Créneau introuvable." };

  const { data: previous } = await supabase
    .from("availabilities")
    .select("status, comment")
    .eq("treatment_id", t.id)
    .eq("member_id", me.id)
    .maybeSingle();

  // Rien n'a changé : on ne dérange personne.
  if (previous?.status === status && previous.comment === comment) return {};

  const { error } = await supabase.from("availabilities").upsert({
    treatment_id: t.id,
    member_id: me.id,
    status,
    comment,
    updated_at: new Date().toISOString(),
  });
  if (error) return SAVE_ERROR;

  await log(me.id, t.id, status, comment);

  const when = slotLabel(t.date, t.slot, parisNow().date);
  if (previous?.status === status) {
    // Même statut, seul le commentaire change (s'il a été effacé, pas de notif).
    if (comment) await announce(`💬 ${me.name} (${when}) : ${comment}`, me.id);
  } else if (status === "dispo") {
    await announce(
      withComment(`${me.name} est dispo pour ${when} (${LOCATION_LABEL[t.location]})`, comment),
      me.id
    );
  } else {
    await announce(withComment(`${me.name} n'est pas dispo pour ${when}`, comment), me.id);
  }

  refresh();
  return {};
}

// --- Traitement fait / annuler ---------------------------------------------

export async function markDone(treatmentId: string, rawComment: string): Promise<ActionResult> {
  const me = await getCurrentMember();
  if (!me) return NOT_LOGGED;

  const comment = cleanComment(rawComment);
  if (comment === false) return { error: `${COMMENT_MAX} caractères maximum.` };

  const t = await getTreatment(treatmentId);
  if (!t) return { error: "Créneau introuvable." };

  // `.is("done_by", null)` : si deux personnes appuient en même temps, une seule gagne.
  const { data, error } = await supabase
    .from("treatments")
    .update({ done_by: me.id, done_at: new Date().toISOString(), done_comment: comment })
    .eq("id", t.id)
    .is("done_by", null)
    .select("id");
  if (error) return SAVE_ERROR;
  if (!data?.length) {
    refresh();
    return { error: "Ce traitement est déjà marqué comme fait." };
  }

  await log(me.id, t.id, "fait", comment);
  await announce(
    withComment(`✅ ${me.name} a donné le traitement ${treatmentOf(t.date, t.slot, parisNow().date)}`, comment),
    me.id
  );

  refresh();
  return {};
}

export async function cancelDone(treatmentId: string): Promise<ActionResult> {
  const me = await getCurrentMember();
  if (!me) return NOT_LOGGED;

  const t = await getTreatment(treatmentId);
  if (!t) return { error: "Créneau introuvable." };
  if (!t.done_by) {
    refresh();
    return {};
  }

  const { error } = await supabase
    .from("treatments")
    .update({ done_by: null, done_at: null, done_comment: null })
    .eq("id", t.id);
  if (error) return SAVE_ERROR;

  await log(me.id, t.id, "fait", CANCEL_MARKER);
  await announce(
    `Le traitement ${treatmentOf(t.date, t.slot, parisNow().date)} n'est finalement pas marqué comme fait`,
    me.id
  );

  refresh();
  return {};
}

// --- Changer le lieu -------------------------------------------------------

// untilId = null → ce créneau seulement ; sinon tous les créneaux jusqu'à untilId inclus.
export async function changeLocation(
  treatmentId: string,
  location: Location,
  untilId: string | null
): Promise<ActionResult> {
  const me = await getCurrentMember();
  if (!me) return NOT_LOGGED;
  if (!(location in LOCATION_LABEL)) return SAVE_ERROR;

  const start = await getTreatment(treatmentId);
  if (!start) return { error: "Créneau introuvable." };

  let end = start;
  if (untilId && untilId !== start.id) {
    const found = await getTreatment(untilId);
    if (!found) return { error: "Créneau de fin introuvable." };
    end = found;
  }
  const from = slotOrder(start.date, start.slot);
  const to = slotOrder(end.date, end.slot);
  if (to < from) return { error: "La fin doit être après le début." };

  // Tous les créneaux entre le début et la fin (inclus).
  const { data: range } = await supabase
    .from("treatments")
    .select("id, date, slot")
    .gte("date", start.date)
    .lte("date", end.date);
  const ids = (range ?? [])
    .filter((r) => {
      const o = slotOrder(r.date, r.slot);
      return o >= from && o <= to;
    })
    .map((r) => r.id);

  const { error } = await supabase.from("treatments").update({ location }).in("id", ids);
  if (error) return SAVE_ERROR;

  // detail : « pegomas » (un seul créneau) ou « pegomas|2026-10-15|soir » (jusqu'au…)
  const single = end.id === start.id;
  await log(me.id, start.id, "lieu", single ? location : `${location}|${end.date}|${end.slot}`);

  const today = parisNow().date;
  const place = LOCATION_LABEL[location];
  await announce(
    single
      ? `📍 Le chat sera à ${place} pour ${slotLabel(start.date, start.slot, today)}`
      : `📍 Le chat sera à ${place} jusqu'à ${slotLabel(end.date, end.slot, today)}`,
    me.id
  );

  refresh();
  return {};
}

// --- Notifications push ----------------------------------------------------

// Ce que le navigateur donne quand on s'abonne (adresse d'envoi + clés de chiffrement).
export type PushSubscriptionData = { endpoint: string; keys: { p256dh: string; auth: string } };

const isShortString = (v: unknown, max: number) => typeof v === "string" && v.length > 0 && v.length <= max;

// Enregistre l'abonnement de ce téléphone pour la personne connectée.
// Si le téléphone était déjà enregistré pour quelqu'un d'autre, il passe à la personne connectée.
export async function subscribePush(sub: PushSubscriptionData): Promise<ActionResult> {
  const me = await getCurrentMember();
  if (!me) return NOT_LOGGED;

  if (
    !isShortString(sub?.endpoint, 1000) ||
    !sub.endpoint.startsWith("https://") ||
    !isShortString(sub.keys?.p256dh, 200) ||
    !isShortString(sub.keys?.auth, 200)
  ) {
    return { error: "Abonnement invalide." };
  }

  const { error } = await supabase.from("push_subscriptions").upsert({
    endpoint: sub.endpoint,
    member_id: me.id,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
  });
  return error ? SAVE_ERROR : {};
}

// Supprime l'abonnement de ce téléphone (seulement s'il appartient à la personne connectée).
export async function unsubscribePush(endpoint: string): Promise<ActionResult> {
  const me = await getCurrentMember();
  if (!me) return NOT_LOGGED;
  if (!isShortString(endpoint, 1000)) return SAVE_ERROR;

  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("member_id", me.id);
  return {};
}

// Notification de test, envoyée uniquement à soi-même.
export async function sendTestNotification(): Promise<ActionResult> {
  const me = await getCurrentMember();
  if (!me) return NOT_LOGGED;

  await notifyMember({ title: NOTIF_TITLE, body: `🔔 Test réussi, ${me.name} : les notifications marchent !`, url: "/" }, me.id);
  return {};
}
