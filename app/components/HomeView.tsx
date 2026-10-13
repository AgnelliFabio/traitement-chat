"use client";

// Accueil : calendrier de 2 semaines en haut, puis le jour choisi (matin + soir) en dessous.
// Les 14 jours sont déjà chargés : changer de jour est instantané, sans recharger la page.

import { useState } from "react";
import type { DayView, SlotOption, SlotView } from "@/lib/labels";
import TreatmentCard from "./TreatmentCard";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

type Props = {
  days: DayView[]; // 14 jours, du lundi de cette semaine au dimanche de la suivante
  initialIndex: number;
  today: string;
  me: string;
  locationOptions: SlotOption[];
};

// Couleur de la pastille d'un créneau dans le calendrier.
function dotColor(slot: SlotView | undefined) {
  if (!slot) return "bg-transparent";
  if (slot.done) return "bg-emerald-600"; // fait
  if (slot.people.some((p) => p.status === "dispo")) return "bg-emerald-300"; // quelqu'un est dispo
  return "bg-zinc-300 dark:bg-zinc-600"; // personne pour l'instant
}

export default function HomeView({ days, initialIndex, today, me, locationOptions }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const day = days[index];

  return (
    <>
      {/* Calendrier */}
      <section className="rounded-3xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((d, i) => (
            <span key={i} className="text-xs font-semibold text-zinc-500">
              {d}
            </span>
          ))}
          {days.map((d, i) => {
            const selected = i === index;
            const isToday = d.date === today;
            const matin = d.slots.find((s) => s.slot === "matin");
            const soir = d.slots.find((s) => s.slot === "soir");
            return (
              <button
                key={d.date}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={d.label}
                className={`flex h-14 flex-col items-center justify-center rounded-xl ${
                  selected ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : ""
                } ${isToday && !selected ? "ring-2 ring-emerald-500" : ""} ${
                  d.date < today && !selected ? "opacity-50" : ""
                }`}
              >
                <span className="text-[10px] leading-none">{d.month ?? " "}</span>
                <span className="text-lg font-semibold leading-tight">{d.dayNumber}</span>
                <span className="flex gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${dotColor(matin)}`} />
                  <span className={`h-1.5 w-1.5 rounded-full ${dotColor(soir)}`} />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Navigation entre les jours. `invisible` cache la flèche sans décaler le titre. */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIndex(index - 1)}
          aria-label="Jour précédent"
          className={`h-12 w-12 rounded-full text-3xl ${index === 0 ? "invisible" : ""}`}
        >
          ‹
        </button>
        <h2 className="text-center text-xl font-bold">
          {day.label}
          {day.date === today && <span className="block text-sm font-normal text-emerald-600">Aujourd&apos;hui</span>}
        </h2>
        <button
          type="button"
          onClick={() => setIndex(index + 1)}
          aria-label="Jour suivant"
          className={`h-12 w-12 rounded-full text-3xl ${index === days.length - 1 ? "invisible" : ""}`}
        >
          ›
        </button>
      </div>

      {/* Les deux créneaux du jour */}
      {day.slots.length === 0 ? (
        <p className="text-center text-zinc-500">Aucun créneau pour ce jour.</p>
      ) : (
        day.slots.map((s) => <TreatmentCard key={s.id} slot={s} me={me} locationOptions={locationOptions} />)
      )}
    </>
  );
}
