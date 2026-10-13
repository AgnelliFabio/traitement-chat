// Lectures en base partagées par plusieurs pages (accueil, historique, notifications).

import "server-only";
import { supabase } from "./supabase";
import type { Member } from "./auth";
import { capitalize, formatTime, slotOrder } from "./time";
import { SLOT_HOUR, type Location, type Slot, type SlotView, type Status } from "./labels";
import type { ActivityRow } from "@/app/components/ActivityFeed";

type TreatmentRow = {
  id: string;
  date: string;
  slot: Slot;
  location: Location;
  done_by: string | null;
  done_at: string | null;
  done_comment: string | null;
};

export async function getMembers(): Promise<Member[]> {
  const { data } = await supabase.from("members").select("id, name").order("name");
  return data ?? [];
}

const nameOf = (members: Member[], id: string | null) =>
  members.find((m) => m.id === id)?.name ?? "Quelqu'un";

// Tous les créneaux entre deux dates (incluses), prêts à afficher, triés matin → soir.
export async function loadSlots(from: string, to: string, members: Member[]): Promise<SlotView[]> {
  const { data } = await supabase
    .from("treatments")
    .select("id, date, slot, location, done_by, done_at, done_comment")
    .gte("date", from)
    .lte("date", to)
    .order("date")
    .order("slot"); // « matin » avant « soir » (ordre alphabétique)
  const treatments = (data ?? []) as TreatmentRow[];

  const { data: availData } = await supabase
    .from("availabilities")
    .select("treatment_id, member_id, status, comment")
    .in("treatment_id", treatments.map((t) => t.id));
  const availabilities = availData ?? [];

  return treatments.map((t) => ({
    id: t.id,
    date: t.date,
    slot: t.slot,
    order: slotOrder(t.date, t.slot),
    title: `${capitalize(t.slot)} · ${SLOT_HOUR[t.slot]}`,
    location: t.location,
    done:
      t.done_by && t.done_at
        ? { by: nameOf(members, t.done_by), at: formatTime(t.done_at), comment: t.done_comment }
        : null,
    people: members.map((m) => {
      const a = availabilities.find((x) => x.treatment_id === t.id && x.member_id === m.id);
      return {
        memberId: m.id,
        name: m.name,
        status: (a?.status as Status) ?? null,
        comment: a?.comment ?? null,
      };
    }),
  }));
}

// Les 20 dernières actions (= les dernières notifications envoyées).
export async function loadActivity(members: Member[]): Promise<ActivityRow[]> {
  const { data } = await supabase
    .from("activity_log")
    .select("id, member_id, treatment_id, action, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  const logs = data ?? [];

  const ids = [...new Set(logs.map((l) => l.treatment_id).filter(Boolean))];
  const { data: treatments } = await supabase.from("treatments").select("id, date, slot").in("id", ids);

  return logs.map((l) => ({
    id: String(l.id),
    action: l.action,
    detail: l.detail,
    created_at: l.created_at,
    name: nameOf(members, l.member_id),
    treatment: treatments?.find((t) => t.id === l.treatment_id) ?? null,
  }));
}
