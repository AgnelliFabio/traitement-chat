// Page d'accueil.
// - Pas identifié → écran « Qui es-tu ? ».
// - Identifié → calendrier de 2 semaines + le jour choisi (voir HomeView).
// Toutes les lectures en base se font ici, côté serveur.

import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentMember } from "@/lib/auth";
import { getMembers, loadSlots } from "@/lib/data";
import {
  addDays,
  capitalize,
  longDate,
  mondayOf,
  parisNow,
  pickNextTreatment,
  shortDate,
  shortMonth,
  slotLabel,
} from "@/lib/time";
import type { DayView, SlotOption } from "@/lib/labels";
import LoginForm from "./components/LoginForm";
import Header from "./components/Header";
import HomeView from "./components/HomeView";

// La page elle-même est une coquille ; le contenu (qui lit le cookie) arrive juste après.
export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-4">
      <Suspense fallback={<p className="text-zinc-500">Chargement…</p>}>
        <Home />
      </Suspense>
    </main>
  );
}

async function Home() {
  const me = await getCurrentMember();
  const members = await getMembers();
  if (!me) return <LoginForm members={members} />;

  // Crée les créneaux manquants des 14 prochains jours.
  await supabase.rpc("ensure_treatments", { days: 14 });

  const now = parisNow();
  const today = now.date;
  const monday = mondayOf(today);
  const sunday = addDays(monday, 13); // dimanche de la semaine suivante

  const slots = await loadSlots(monday, sunday, members);

  // Les 14 jours du calendrier, chacun avec ses créneaux.
  const days: DayView[] = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(monday, i);
    const dayNumber = Number(date.slice(8));
    return {
      date,
      label: longDate(date),
      dayNumber,
      month: i === 0 || dayNumber === 1 ? shortMonth(date) : null,
      slots: slots.filter((s) => s.date === date),
    };
  });

  // On ouvre sur le jour du prochain traitement (aujourd'hui, ou demain si le soir est fait).
  const nextDate = pickNextTreatment(slots, now)?.date ?? today;
  const initialIndex = Math.max(0, days.findIndex((d) => d.date === nextDate));

  // Choix possibles pour « Changer le lieu → Jusqu'au… »
  const locationOptions: SlotOption[] = slots.map((s) => ({
    id: s.id,
    order: s.order,
    label: `${capitalize(slotLabel(s.date, s.slot, today))} (${shortDate(s.date)})`,
  }));

  return (
    <>
      <Header title={`🐱 Bonjour ${me.name}`} />
      <HomeView
        days={days}
        initialIndex={initialIndex}
        today={today}
        me={me.id}
        locationOptions={locationOptions}
      />
    </>
  );
}
