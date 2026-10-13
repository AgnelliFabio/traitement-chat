// Fiche d'identité de l'app : nom, icônes, couleurs, et ouverture en plein écran
// (`standalone` = sans la barre du navigateur, comme une vraie app).

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Traitement chat",
    short_name: "Traitement chat",
    description: "Qui donne le traitement au chat ?",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#059669",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
