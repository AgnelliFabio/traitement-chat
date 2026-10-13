"use client";

// Bloc « Sur ce téléphone » de la page Notifications.
// Affiche ce qu'il faut selon la situation : installer l'app (iPhone), activer,
// réautoriser, ou bien « activées » avec la notif de test.

import { useEffect, useState, useTransition } from "react";
import { sendTestNotification, subscribePush, unsubscribePush, type PushSubscriptionData } from "@/app/actions";
import { detectPushState, getRegistration, urlBase64ToUint8Array, type PushState } from "./pushState";

// Convertit l'abonnement du navigateur en simple objet envoyable au serveur.
const toData = (sub: PushSubscription) => sub.toJSON() as PushSubscriptionData;

export default function PushManager() {
  const [state, setState] = useState<PushState>("loading");
  const [sub, setSub] = useState<PushSubscription | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    detectPushState()
      .then(async (r) => {
        // Déjà abonné : on ré-enregistre côté serveur (au cas où la base l'aurait perdu
        // ou si une autre personne s'est connectée sur ce téléphone).
        if (r.sub) await subscribePush(toData(r.sub));
        setSub(r.sub);
        setState(r.state);
      })
      .catch(() => setState("unsupported"));
  }, []);

  // La demande d'autorisation DOIT partir d'un clic (obligatoire sur iPhone).
  function activate() {
    setMessage(null);
    startTransition(async () => {
      try {
        const registration = await getRegistration();
        const newSub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
        });
        const result = await subscribePush(toData(newSub));
        if (result.error) {
          setMessage(result.error);
          return;
        }
        setSub(newSub);
        setState("on");
      } catch {
        if (Notification.permission === "denied") setState("denied");
        else setMessage("Impossible d'activer les notifications. Réessaie.");
      }
    });
  }

  function deactivate() {
    setMessage(null);
    startTransition(async () => {
      if (sub) {
        await unsubscribePush(sub.endpoint);
        await sub.unsubscribe();
      }
      setSub(null);
      setState("off");
    });
  }

  function test() {
    setMessage(null);
    startTransition(async () => {
      const result = await sendTestNotification();
      setMessage(result.error ?? "Notification envoyée ! Elle devrait arriver dans quelques secondes.");
    });
  }

  const bigButton = "h-14 w-full rounded-2xl text-lg font-semibold disabled:opacity-50";

  return (
    <div className="flex flex-col gap-3">
      {state === "loading" && <p className="text-zinc-500">Vérification…</p>}

      {state === "unsupported" && (
        <p>Ce navigateur ne permet pas les notifications. Sur Android, utilise Chrome.</p>
      )}

      {state === "ios-install" && (
        <div className="flex flex-col gap-2">
          <p>Sur iPhone, il faut d&apos;abord installer l&apos;app :</p>
          <ol className="flex list-decimal flex-col gap-1 pl-5">
            <li>
              Dans Safari, touche le bouton <strong>Partager</strong> (carré avec une flèche vers le haut)
            </li>
            <li>
              Choisis <strong>« Sur l&apos;écran d&apos;accueil »</strong>, puis <strong>Ajouter</strong>
            </li>
            <li>Ferme Safari et ouvre l&apos;app depuis la nouvelle icône 🐱</li>
            <li>Reviens sur cette page pour activer les notifications</li>
          </ol>
        </div>
      )}

      {state === "denied" && (
        <p>
          Les notifications ont été refusées sur ce téléphone. Pour les réautoriser : ouvre les
          <strong> Réglages</strong> du téléphone → <strong>Notifications</strong> → « Traitement chat »
          (ou, sur Android, les réglages du site dans Chrome), puis reviens ici.
        </p>
      )}

      {state === "off" && (
        <>
          <p>Les notifications ne sont pas encore activées sur ce téléphone.</p>
          <button
            type="button"
            onClick={activate}
            disabled={pending}
            className={`${bigButton} bg-emerald-600 text-white`}
          >
            {pending ? "Activation…" : "🔔 Activer les notifications"}
          </button>
        </>
      )}

      {state === "on" && (
        <>
          <p className="font-semibold">✅ Notifications activées sur ce téléphone</p>
          <button
            type="button"
            onClick={test}
            disabled={pending}
            className={`${bigButton} border-2 border-zinc-300 dark:border-zinc-700`}
          >
            Envoyer une notif de test
          </button>
          <button type="button" onClick={deactivate} disabled={pending} className="self-start text-sm text-zinc-500 underline">
            Désactiver sur ce téléphone
          </button>
        </>
      )}

      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}
