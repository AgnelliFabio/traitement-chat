// Outils côté navigateur pour savoir où en sont les notifications sur CE téléphone.
// Utilisé par le bloc « Sur ce téléphone » (page Notifications) et le bandeau de l'accueil.

export type PushState =
  | "loading" // on vérifie…
  | "unsupported" // navigateur trop ancien / incompatible
  | "ios-install" // iPhone : il faut d'abord ajouter l'app à l'écran d'accueil
  | "denied" // la personne a refusé les notifications
  | "off" // pas encore activées
  | "on"; // activées sur ce téléphone

export function isIos(): boolean {
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    // les iPad récents se présentent comme des Mac
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

// L'app est-elle ouverte depuis l'icône de l'écran d'accueil (et pas dans le navigateur) ?
export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// Enregistre (ou retrouve, s'il l'est déjà) le service worker.
export async function getRegistration() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
}

export async function detectPushState(): Promise<{ state: PushState; sub: PushSubscription | null }> {
  if (isIos() && !isStandalone()) return { state: "ios-install", sub: null };
  if (!isPushSupported()) return { state: "unsupported", sub: null };

  const registration = await getRegistration();
  const sub = await registration.pushManager.getSubscription();
  if (sub) return { state: "on", sub };
  if (Notification.permission === "denied") return { state: "denied", sub: null };
  return { state: "off", sub: null };
}

// La clé publique VAPID est en texte « base64 » ; le navigateur la veut en octets.
export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}
