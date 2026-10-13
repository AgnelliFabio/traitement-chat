"use client";

// Bandeau de l'accueil : « 🔔 Active les notifications », tant qu'elles ne sont pas
// activées sur ce téléphone. Mène à la page Notifications.

import { useEffect, useState } from "react";
import Link from "next/link";
import { detectPushState, type PushState } from "./pushState";

export default function PushBanner() {
  const [state, setState] = useState<PushState>("loading");

  useEffect(() => {
    detectPushState()
      .then((r) => setState(r.state))
      .catch(() => setState("unsupported"));
  }, []);

  if (state !== "off" && state !== "ios-install") return null;

  return (
    <Link
      href="/notifications"
      className="rounded-2xl bg-amber-100 px-4 py-3 font-semibold text-amber-900 dark:bg-amber-900 dark:text-amber-100"
    >
      🔔 Active les notifications sur ce téléphone →
    </Link>
  );
}
