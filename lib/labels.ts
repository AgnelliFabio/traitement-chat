// Constantes et types partagés entre le serveur et l'écran (pas de secret ici).

export type Slot = "matin" | "soir";
export type Location = "mandelieu" | "pegomas";
export type Status = "dispo" | "indispo";

export const LOCATION_LABEL: Record<Location, string> = {
  mandelieu: "Mandelieu",
  pegomas: "Pégomas",
};

export const SLOT_HOUR: Record<Slot, string> = { matin: "7h", soir: "19h" };

export const COMMENT_MAX = 100;

// Suggestions en un clic dans le panneau commentaire.
export const AVAILABILITY_SUGGESTIONS = [
  "J'arrive à 20h",
  "Je pars tôt",
  "Peut-être",
  "Je confirme plus tard",
];
export const DONE_SUGGESTIONS = ["Il a bien mangé", "Il a eu du mal", "Tout s'est bien passé"];

// Valeur spéciale écrite dans activity_log.detail quand on annule un « fait »
// (la colonne `action` n'accepte que dispo / indispo / fait / lieu).
export const CANCEL_MARKER = "[annulation]";

// Ce que la page envoie à chaque carte de créneau (données déjà prêtes à afficher).
export type SlotView = {
  id: string;
  date: string;
  slot: Slot;
  order: string;
  title: string; // « Soir · 19h »
  location: Location;
  done: null | { by: string; at: string; comment: string | null };
  people: { memberId: string; name: string; status: Status | null; comment: string | null }[];
};

// Un créneau proposé dans « Changer le lieu → Jusqu'au… »
export type SlotOption = { id: string; order: string; label: string };

// Un jour du calendrier de l'accueil, avec ses deux créneaux.
export type DayView = {
  date: string;
  label: string; // « Mardi 13 octobre »
  dayNumber: number; // 13
  month: string | null; // « oct. », affiché seulement sur la 1re case et les 1ers du mois
  slots: SlotView[];
};
