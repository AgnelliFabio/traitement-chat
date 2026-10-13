"use client";

// Bouton ☰ en haut à droite. Il ouvre un panneau qui glisse depuis la droite.

import { useState } from "react";
import Link from "next/link";
import { logout } from "@/app/actions";

export default function Menu() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const item = "block rounded-xl px-4 py-3 text-lg font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Menu" className="h-12 w-12 text-3xl">
        ☰
      </button>

      {/* Fond grisé : un clic dessus ferme le menu */}
      <div
        onClick={close}
        className={`fixed inset-0 z-10 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <nav
        className={`fixed right-0 top-0 z-20 flex h-full w-64 flex-col gap-1 bg-white p-4 pt-[max(1rem,env(safe-area-inset-top))] shadow-xl transition-transform dark:bg-zinc-900 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <button type="button" onClick={close} aria-label="Fermer" className="mb-2 self-end text-3xl">
          ×
        </button>
        <Link href="/" onClick={close} className={item}>
          Accueil
        </Link>
        <Link href="/historique" onClick={close} className={item}>
          Historique
        </Link>
        <Link href="/notifications" onClick={close} className={item}>
          Notifications
        </Link>
        <form action={logout}>
          <button type="submit" className={`${item} w-full text-left text-red-600 dark:text-red-400`}>
            Déconnexion
          </button>
        </form>
      </nav>
    </>
  );
}
