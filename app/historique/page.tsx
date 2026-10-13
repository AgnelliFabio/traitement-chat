// Page Historique : ce qui s'est passé ces 14 derniers jours, en texte simple.
// On affiche l'état final de chaque créneau (qui était dispo, qui l'a fait).

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { getMembers, loadSlots } from "@/lib/data";
import { addDays, capitalize, longDate, parisNow } from "@/lib/time";
import { LOCATION_LABEL, type SlotView } from "@/lib/labels";
import Header from "../components/Header";

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-4">
      <Suspense fallback={<p className="text-zinc-500">Chargement…</p>}>
        <Historique />
      </Suspense>
    </main>
  );
}

// « Fabio - Pas dispo « Je commence à 5h » »
function personLine(slot: SlotView, person: SlotView["people"][number]): string {
  if (slot.done?.by === person.name) {
    return `${person.name} - Traitement fait${slot.done.comment ? ` « ${slot.done.comment} »` : ""}`;
  }
  const status =
    person.status === "dispo" ? "Dispo" : person.status === "indispo" ? "Pas dispo" : "Pas de réponse";
  return `${person.name} - ${status}${person.comment ? ` « ${person.comment} »` : ""}`;
}

async function Historique() {
  if (!(await getCurrentMember())) redirect("/");

  const today = parisNow().date;
  const members = await getMembers();
  const slots = await loadSlots(addDays(today, -13), today, members);

  // Regroupe par jour, du plus récent au plus ancien.
  const dates = [...new Set(slots.map((s) => s.date))].sort().reverse();

  return (
    <>
      <Header title="Historique" />
      {dates.length === 0 && <p className="text-zinc-500">Rien pour l&apos;instant.</p>}
      {dates.map((date) => (
        <section key={date} className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">{longDate(date)}</h2>
          {slots
            .filter((s) => s.date === date)
            .map((s) => (
              <div key={s.id}>
                <p className="font-semibold">
                  {capitalize(s.slot)} à {LOCATION_LABEL[s.location]}
                </p>
                {s.people.map((p) => (
                  <p key={p.memberId}>{personLine(s, p)}</p>
                ))}
              </div>
            ))}
        </section>
      ))}
    </>
  );
}
