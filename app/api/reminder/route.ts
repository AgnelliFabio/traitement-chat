// Rappels automatiques. Appelée toutes les heures à la minute 30 par pg_cron (configuré plus tard).
// Protégée : il faut l'en-tête « Authorization: Bearer <CRON_SECRET> ».
//
// On ne regarde que l'heure de Paris (pas la minute), pour tolérer un léger retard de l'appel :
// - 6h / 18h  → rappel avant le créneau (qui s'en occupe, ou personne) ;
// - 7h / 19h  → alerte si le traitement n'est pas marqué fait.

import { supabase } from "@/lib/supabase";
import { notify } from "@/lib/push";
import { parisNow } from "@/lib/time";
import { LOCATION_LABEL, SLOT_HOUR, type Location, type Slot } from "@/lib/labels";

const TITLE = "🐱 Traitement du chat";

const SCHEDULE: Record<number, { slot: Slot; moment: "avant" | "apres" }> = {
  6: { slot: "matin", moment: "avant" },
  18: { slot: "soir", moment: "avant" },
  7: { slot: "matin", moment: "apres" },
  19: { slot: "soir", moment: "apres" },
};

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }

  await supabase.rpc("ensure_treatments", { days: 14 });

  const now = parisNow();
  const plan = SCHEDULE[now.hour];
  if (!plan) return Response.json({ skipped: true });

  const { data: t } = await supabase
    .from("treatments")
    .select("id, location, done_by")
    .eq("date", now.date)
    .eq("slot", plan.slot)
    .maybeSingle();
  if (!t) return Response.json({ skipped: true, reason: "créneau introuvable" });

  const label = `${SLOT_HOUR[plan.slot]} (${LOCATION_LABEL[t.location as Location]})`;

  if (plan.moment === "apres") {
    if (t.done_by) return Response.json({ sent: false });
    const body = `⏰ Le traitement de ${SLOT_HOUR[plan.slot]} n'est pas encore marqué comme fait`;
    await notify({ title: TITLE, body, url: "/" });
    return Response.json({ sent: true, body });
  }

  // Avant le créneau : déjà fait (en avance) → rien à dire.
  if (t.done_by) return Response.json({ sent: false });

  const [{ data: avail }, { data: members }] = await Promise.all([
    supabase.from("availabilities").select("member_id, comment").eq("treatment_id", t.id).eq("status", "dispo"),
    supabase.from("members").select("id, name"),
  ]);
  const volunteers = (avail ?? []).map((a) => ({
    name: members?.find((m) => m.id === a.member_id)?.name ?? "Quelqu'un",
    comment: a.comment as string | null,
  }));

  let body: string;
  if (volunteers.length === 0) {
    body = `⚠️ Personne ne s'est déclaré dispo pour le traitement de ${label}`;
  } else if (volunteers.length === 1) {
    const v = volunteers[0];
    body = `Rappel : ${v.name} s'occupe du traitement de ${label}${v.comment ? ` : ${v.comment}` : ""}`;
  } else {
    const names = volunteers.map((v) => v.name).join(" et ");
    const comments = volunteers.filter((v) => v.comment).map((v) => `${v.name} : ${v.comment}`);
    body = `Rappel : ${names} sont dispo pour le traitement de ${label}${
      comments.length ? ` — ${comments.join(" ; ")}` : ""
    }`;
  }

  await notify({ title: TITLE, body, url: "/" });
  return Response.json({ sent: true, body });
}
