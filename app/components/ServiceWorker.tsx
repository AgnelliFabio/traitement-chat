"use client";

// Enregistre le service worker (public/sw.js) au chargement de l'app. N'affiche rien.

import { useEffect } from "react";

export default function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch((err) => console.error("Service worker non enregistré :", err));
    }
  }, []);
  return null;
}
