"use client";

// Écran « Qui es-tu ? » : on choisit son prénom, on tape le code famille, c'est tout.

import { useActionState, useState } from "react";
import { login } from "@/app/actions";
import type { Member } from "@/lib/auth";

export default function LoginForm({ members }: { members: Member[] }) {
  const [state, formAction, pending] = useActionState(login, {});
  const [memberId, setMemberId] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">🐱 Qui es-tu ?</h1>

      <input type="hidden" name="memberId" value={memberId} />
      <div className="flex flex-col gap-3">
        {members.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMemberId(m.id)}
            className={`h-16 rounded-2xl border-2 text-xl font-semibold ${
              memberId === m.id
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-zinc-300 dark:border-zinc-700"
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-2 text-lg">
        Code famille
        <input
          name="code"
          type="password"
          required
          autoComplete="off"
          className="h-14 rounded-2xl border-2 border-zinc-300 bg-transparent px-4 text-xl dark:border-zinc-700"
        />
      </label>

      {state.error && <p className="text-lg text-red-600 dark:text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || !memberId}
        className="h-16 rounded-2xl bg-zinc-900 text-xl font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-zinc-900"
      >
        {pending ? "Vérification…" : "C'est parti"}
      </button>
    </form>
  );
}
