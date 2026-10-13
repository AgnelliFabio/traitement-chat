// Historique des dernières actions, en phrases simples.
// Composant « serveur » : il ne fait qu'afficher, aucun bouton.

import { CANCEL_MARKER, LOCATION_LABEL, type Location, type Slot } from "@/lib/labels";
import { slotLabel, timeAgo, treatmentOf } from "@/lib/time";

export type HistoryRow = {
  id: string;
  action: "dispo" | "indispo" | "fait" | "lieu";
  detail: string | null;
  created_at: string;
  name: string;
  treatment: { date: string; slot: Slot } | null;
};

// Transforme une ligne de activity_log en phrase : « Tommy est dispo pour demain matin — Je pars tôt »
function describe(row: HistoryRow, today: string): string {
  const t = row.treatment;
  const when = t ? slotLabel(t.date, t.slot, today) : "un créneau";
  const of = t ? treatmentOf(t.date, t.slot, today) : "";
  const comment = row.detail ? ` — ${row.detail}` : "";

  switch (row.action) {
    case "dispo":
      return `${row.name} est dispo pour ${when}${comment}`;
    case "indispo":
      return `${row.name} n'est pas dispo pour ${when}${comment}`;
    case "fait":
      return row.detail === CANCEL_MARKER
        ? `↩️ ${row.name} a annulé le traitement ${of}`
        : `✅ ${row.name} a donné le traitement ${of}${comment}`;
    case "lieu": {
      // detail = « pegomas » ou « pegomas|2026-10-15|soir »
      const [loc, endDate, endSlot] = (row.detail ?? "").split("|");
      const place = LOCATION_LABEL[loc as Location] ?? loc;
      return endDate
        ? `📍 ${row.name} : le chat sera à ${place} jusqu'à ${slotLabel(endDate, endSlot as Slot, today)}`
        : `📍 ${row.name} : le chat sera à ${place} pour ${when}`;
    }
  }
}

export default function History({ rows, today }: { rows: HistoryRow[]; today: string }) {
  if (rows.length === 0) return <p className="text-zinc-500">Rien pour l&apos;instant.</p>;

  const now = new Date();
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => (
        <li key={row.id} className="text-sm">
          {describe(row, today)}
          <span className="text-zinc-500"> · {timeAgo(row.created_at, now)}</span>
        </li>
      ))}
    </ul>
  );
}
