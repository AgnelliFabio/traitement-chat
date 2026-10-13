"use client";

// Petit panneau qui s'ouvre après « Je suis dispo », « Pas dispo » ou « Traitement fait » :
// un champ texte facultatif, un compteur, des suggestions en un clic et « Valider ».

import { useState } from "react";
import { COMMENT_MAX } from "@/lib/labels";

type Props = {
  title: string;
  initial: string;
  suggestions: string[];
  pending: boolean;
  onSubmit: (comment: string) => void;
  onClose: () => void;
};

export default function CommentPanel({ title, initial, suggestions, pending, onSubmit, onClose }: Props) {
  const [text, setText] = useState(initial);

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-zinc-100 p-4 dark:bg-zinc-800">
      <p className="font-semibold">{title}</p>

      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={COMMENT_MAX}
          placeholder="Commentaire (facultatif)"
          className="h-12 min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-3 text-base dark:border-zinc-600 dark:bg-zinc-900"
        />
        <span className="text-sm text-zinc-500 tabular-nums">
          {text.length}/{COMMENT_MAX}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setText(s)}
            className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => onSubmit(text)}
          className="h-12 flex-1 rounded-xl bg-emerald-600 font-semibold text-white disabled:opacity-50"
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
