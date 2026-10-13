"use client";

// La carte d'un créneau (matin ou soir d'un jour donné).
// Affiche le lieu, qui est dispo, si c'est fait, et les boutons d'action.

import { useState, useTransition } from "react";
import { cancelDone, changeLocation, markDone, setAvailability, type ActionResult } from "@/app/actions";
import {
  AVAILABILITY_SUGGESTIONS,
  DONE_SUGGESTIONS,
  LOCATION_LABEL,
  type SlotOption,
  type SlotView,
} from "@/lib/labels";
import CommentPanel from "./CommentPanel";
import LocationPanel from "./LocationPanel";

type Panel = null | "dispo" | "indispo" | "fait" | "lieu" | "annuler";

const LOCATION_STYLE = {
  mandelieu: "bg-sky-100 text-sky-900 dark:bg-sky-900 dark:text-sky-100",
  pegomas: "bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100",
};

type Props = { slot: SlotView; me: string; locationOptions: SlotOption[] };

export default function TreatmentCard({ slot, me, locationOptions }: Props) {
  const [panel, setPanel] = useState<Panel>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const mine = slot.people.find((p) => p.memberId === me);
  const laterSlots = locationOptions.filter((o) => o.order > slot.order);

  // Lance une action serveur ; ferme le panneau si tout s'est bien passé.
  function run(action: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else setPanel(null);
    });
  }

  const toggle = (p: Panel) => setPanel(panel === p ? null : p);
  const btn = "h-12 text-base";

  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* En-tête : créneau + lieu */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold">{slot.title}</h2>
        <span className={`rounded-full px-3 py-1 font-semibold ${LOCATION_STYLE[slot.location]}`}>
          📍 {LOCATION_LABEL[slot.location]}
        </span>
      </div>

      {/* Fait ? */}
      {slot.done && (
        <div className="rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-950">
          <p className="font-semibold">
            ✅ Fait par {slot.done.by} à {slot.done.at}
          </p>
          {slot.done.comment && <p className="text-sm italic text-zinc-600 dark:text-zinc-300">{slot.done.comment}</p>}
          {panel === "annuler" ? (
            <div className="mt-2 flex items-center gap-3">
              <span className="text-sm">Annuler le « fait » ?</span>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => cancelDone(slot.id))}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white"
              >
                Oui, annuler
              </button>
              <button type="button" onClick={() => setPanel(null)} className="text-sm underline">
                Non
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setPanel("annuler")} className="mt-1 text-sm text-zinc-500 underline">
              Annuler
            </button>
          )}
        </div>
      )}

      {/* Statut de chacun */}
      <ul className="flex flex-col gap-1">
        {slot.people.map((p) => (
          <li key={p.memberId}>
            <span className="font-medium">{p.name}</span>
            {" · "}
            {p.status === "dispo" && <span className="text-emerald-700 dark:text-emerald-400">Dispo</span>}
            {p.status === "indispo" && <span className="text-red-700 dark:text-red-400">Pas dispo</span>}
            {!p.status && <span className="text-zinc-500">Pas encore répondu</span>}
            {p.comment && <span className="text-sm italic text-zinc-600 dark:text-zinc-400"> — {p.comment}</span>}
          </li>
        ))}
      </ul>

      {/* Boutons */}
      <div className="grid grid-cols-2 gap-2">
        {!slot.done && (
          <>
            <button
              type="button"
              onClick={() => toggle("dispo")}
              className={`${btn} rounded-2xl border-2 font-semibold ${
                mine?.status === "dispo"
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-emerald-600 text-emerald-700 dark:text-emerald-400"
              }`}
            >
              Je suis dispo
            </button>
            <button
              type="button"
              onClick={() => toggle("indispo")}
              className={`${btn} rounded-2xl border-2 font-semibold ${
                mine?.status === "indispo"
                  ? "border-red-600 bg-red-600 text-white"
                  : "border-red-600 text-red-700 dark:text-red-400"
              }`}
            >
              Pas dispo
            </button>
            <button
              type="button"
              onClick={() => toggle("fait")}
              className={`${btn} rounded-2xl bg-zinc-900 font-semibold text-white dark:bg-white dark:text-zinc-900`}
            >
              Traitement fait
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => toggle("lieu")}
          className={`${btn} rounded-2xl border-2 border-zinc-300 font-semibold dark:border-zinc-700 ${
            slot.done ? "col-span-2" : ""
          }`}
        >
          Changer le lieu
        </button>
      </div>

      {/* Panneaux (un seul ouvert à la fois). `key` remet le champ à zéro quand on change de panneau. */}
      {(panel === "dispo" || panel === "indispo") && (
        <CommentPanel
          key={panel}
          title={panel === "dispo" ? "Je suis dispo" : "Pas dispo"}
          initial={mine?.status === panel ? mine.comment ?? "" : ""}
          suggestions={AVAILABILITY_SUGGESTIONS}
          pending={pending}
          onSubmit={(comment) => run(() => setAvailability(slot.id, panel, comment))}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === "fait" && (
        <CommentPanel
          key="fait"
          title="Traitement fait"
          initial=""
          suggestions={DONE_SUGGESTIONS}
          pending={pending}
          onSubmit={(comment) => run(() => markDone(slot.id, comment))}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === "lieu" && (
        <LocationPanel
          current={slot.location}
          options={laterSlots}
          pending={pending}
          onSubmit={(location, untilId) => run(() => changeLocation(slot.id, location, untilId))}
          onClose={() => setPanel(null)}
        />
      )}

      {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
}
