// Page Notifications :
// 1. « Sur ce téléphone » : activation des notifications (arrive à l'étape suivante) ;
// 2. « Ce que tu reçois » : mémo des notifications existantes ;
// 3. « Dernières notifications » : les 20 dernières actions, pour rattraper une notif ratée.

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { getMembers, loadActivity } from "@/lib/data";
import { parisNow } from "@/lib/time";
import Header from "../components/Header";
import ActivityFeed from "../components/ActivityFeed";

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-4">
      <Suspense fallback={<p className="text-zinc-500">Chargement…</p>}>
        <Notifications />
      </Suspense>
    </main>
  );
}

const card = "flex flex-col gap-2 rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900";

async function Notifications() {
  if (!(await getCurrentMember())) redirect("/");

  const members = await getMembers();
  const activity = await loadActivity(members);

  return (
    <>
      <Header title="Notifications" />

      <section className={card}>
        <h2 className="text-lg font-semibold">Sur ce téléphone</h2>
        <p className="text-zinc-500">
          Bientôt disponible : un bouton pour activer les notifications sur ce téléphone, et un autre
          pour s&apos;envoyer une notification de test.
        </p>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">Ce que tu reçois</h2>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>Quand quelqu&apos;un se dit dispo ou pas dispo</li>
          <li>Quand le traitement est fait (ou annulé)</li>
          <li>Quand le lieu change</li>
          <li>À 6h30 et 18h30 : qui s&apos;occupe du prochain traitement (ou alerte si personne)</li>
          <li>À 7h30 et 19h30 : alerte si le traitement n&apos;est pas encore marqué fait</li>
        </ul>
        <p className="text-sm text-zinc-500">Tu ne reçois pas de notification pour tes propres actions.</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Dernières notifications</h2>
        <ActivityFeed rows={activity} today={parisNow().date} />
      </section>
    </>
  );
}
