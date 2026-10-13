// Page d'accueil.
// - Pas identifié → écran « Qui es-tu ? ».
// - Identifié → prochain traitement en grand, les ~3 jours suivants, puis l'historique.
// Toutes les lectures en base se font ici, côté serveur.

import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentMember } from "@/lib/auth";
import { logout } from "@/app/actions";
import { addDays, formatTime, parisNow, pickNextTreatment, shortDate, slotLabel, slotOrder } from "@/lib/time";
import { SLOT_HOUR, type Location, type Slot, type SlotOption, type SlotView, type Status } from "@/lib/labels";
import LoginForm from "./components/LoginForm";
import TreatmentCard from "./components/TreatmentCard";
import History, { type HistoryRow } from "./components/History";

type TreatmentRow = {
  id: string;
  date: string;
  slot: Slot;
  location: Location;
  done_by: string | null;
  done_at: string | null;
  done_comment: string | null;
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// La page elle-même est une coquille ; le contenu (qui lit le cookie) arrive juste après.
export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
      <Suspense fallback={<p className="text-zinc-500">Chargement…</p>}>
        <Home />
      </Suspense>
    </main>
  );
}

async function Home() {
  const me = await getCurrentMember();

  const { data: members } = await supabase.from("members").select("id, name").order("name");
  if (!me) return <LoginForm members={members ?? []} />;

  // Crée les créneaux manquants des 14 prochains jours.
  await supabase.rpc("ensure_treatments", { days: 14 });

  const now = parisNow();
  const today = now.date;

  const [{ data: treatmentsData }, { data: logsData }] = await Promise.all([
    supabase
      .from("treatments")
      .select("id, date, slot, location, done_by, done_at, done_comment")
      .gte("date", today)
      .lte("date", addDays(today, 14))
      .order("date")
      .order("slot"), // « matin » avant « soir » (ordre alphabétique)
    supabase
      .from("activity_log")
      .select("id, member_id, treatment_id, action, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const treatments = (treatmentsData ?? []) as TreatmentRow[];
  const logs = logsData ?? [];

  // Réponses de chacun pour ces créneaux.
  const { data: availData } = await supabase
    .from("availabilities")
    .select("treatment_id, member_id, status, comment")
    .in("treatment_id", treatments.map((t) => t.id));
  const availabilities = availData ?? [];

  // Créneaux cités dans l'historique mais pas dans la liste ci-dessus (ex. hier).
  const known = new Map<string, { date: string; slot: Slot }>(treatments.map((t) => [t.id, t]));
  const missing = [...new Set(logs.map((l) => l.treatment_id).filter((id) => id && !known.has(id)))];
  if (missing.length) {
    const { data } = await supabase.from("treatments").select("id, date, slot").in("id", missing);
    for (const t of data ?? []) known.set(t.id, t);
  }

  const nameOf = (id: string | null) => members?.find((m) => m.id === id)?.name ?? "Quelqu'un";

  // Prépare une carte prête à afficher.
  const toView = (t: TreatmentRow): SlotView => ({
    id: t.id,
    order: slotOrder(t.date, t.slot),
    title: `${capitalize(slotLabel(t.date, t.slot, today))} · ${SLOT_HOUR[t.slot]}`,
    dateLabel: shortDate(t.date),
    location: t.location,
    done:
      t.done_by && t.done_at
        ? { by: nameOf(t.done_by), at: formatTime(t.done_at), comment: t.done_comment }
        : null,
    people: (members ?? []).map((m) => {
      const a = availabilities.find((x) => x.treatment_id === t.id && x.member_id === m.id);
      return {
        memberId: m.id,
        name: m.name,
        status: (a?.status as Status) ?? null,
        comment: a?.comment ?? null,
      };
    }),
  });

  const next = pickNextTreatment(treatments, now);
  const upcoming = treatments.filter((t) => t.date <= addDays(today, 3) && t.id !== next?.id);

  // Choix possibles pour « Changer le lieu → Jusqu'au… »
  const locationOptions: SlotOption[] = treatments.map((t) => ({
    id: t.id,
    order: slotOrder(t.date, t.slot),
    label: `${capitalize(slotLabel(t.date, t.slot, today))} (${shortDate(t.date)})`,
  }));

  const history: HistoryRow[] = logs.map((l) => ({
    id: String(l.id),
    action: l.action,
    detail: l.detail,
    created_at: l.created_at,
    name: nameOf(l.member_id),
    treatment: known.get(l.treatment_id) ?? null,
  }));

  return (
    <>
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">🐱 Bonjour {me.name}</h1>
        <form action={logout}>
          <button type="submit" className="text-sm text-zinc-500 underline">
            Changer de personne
          </button>
        </form>
      </header>

      {next ? (
        <TreatmentCard slot={toView(next)} me={me.id} big locationOptions={locationOptions} />
      ) : (
        <p>Aucun créneau trouvé.</p>
      )}

      {upcoming.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Les prochains jours</h2>
          {upcoming.map((t) => (
            <TreatmentCard key={t.id} slot={toView(t)} me={me.id} locationOptions={locationOptions} />
          ))}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Historique</h2>
        <History rows={history} today={today} />
      </section>
    </>
  );
}
