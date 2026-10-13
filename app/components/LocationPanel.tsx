"use client";

// Panneau « Changer le lieu » : Mandelieu / Pégomas, puis « Ce traitement seulement »
// ou « Jusqu'au… » (on choisit le dernier créneau concerné dans une liste).

import { useState } from "react";
import { LOCATION_LABEL, type Location, type SlotOption } from "@/lib/labels";

type Props = {
  current: Location;
  options: SlotOption[]; // créneaux situés APRÈS celui-ci
  pending: boolean;
  onSubmit: (location: Location, untilId: string | null) => void;
  onClose: () => void;
};

export default function LocationPanel({ current, options, pending, onSubmit, onClose }: Props) {
  // Par défaut on propose l'autre lieu (c'est le plus probable).
  const [location, setLocation] = useState<Location>(current === "mandelieu" ? "pegomas" : "mandelieu");
  const [scope, setScope] = useState<"seul" | "jusqua">("seul");
  const [untilId, setUntilId] = useState(options[0]?.id ?? "");

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-zinc-100 p-4 dark:bg-zinc-800">
      <p className="font-semibold">Où sera le chat ?</p>

      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(LOCATION_LABEL) as Location[]).map((loc) => (
          <button
            key={loc}
            type="button"
            onClick={() => setLocation(loc)}
            className={`h-12 rounded-xl border-2 font-semibold ${
              location === loc ? "border-sky-600 bg-sky-600 text-white" : "border-zinc-300 dark:border-zinc-600"
            }`}
          >
            {LOCATION_LABEL[loc]}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2">
        <input type="radio" checked={scope === "seul"} onChange={() => setScope("seul")} className="h-5 w-5" />
        Ce traitement seulement
      </label>
      {options.length > 0 && (
        <label className="flex flex-wrap items-center gap-2">
          <input type="radio" checked={scope === "jusqua"} onChange={() => setScope("jusqua")} className="h-5 w-5" />
          Jusqu&apos;au…
          <select
            value={untilId}
            onChange={(e) => {
              setUntilId(e.target.value);
              setScope("jusqua");
            }}
            className="h-10 rounded-lg border border-zinc-300 bg-white px-2 dark:border-zinc-600 dark:bg-zinc-900"
          >
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => onSubmit(location, scope === "jusqua" ? untilId : null)}
          className="h-12 flex-1 rounded-xl bg-sky-600 font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Envoi…" : "Valider"}
        </button>
        <button type="button" onClick={onClose} className="h-12 rounded-xl px-4 text-zinc-600 dark:text-zinc-300">
          Fermer
        </button>
      </div>
    </div>
  );
}
