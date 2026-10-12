import "server-only";
import webpush from "web-push";
import { supabase } from "./supabase";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

type Payload = { title: string; body: string; url?: string };

// Envoie une notification à tout le monde, sauf (optionnellement) à la personne
// qui vient d'agir : inutile de te notifier de ta propre action.
export async function notify(payload: Payload, exceptMemberId?: string) {
  let query = supabase.from("push_subscriptions").select("*");
  if (exceptMemberId) query = query.neq("member_id", exceptMemberId);

  const { data: subs } = await query;

  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload)
        );
      } catch (err: any) {
        // 404 / 410 = l'abonnement n'existe plus (app désinstallée,
        // notifications coupées...) : on le supprime de la base.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        }
      }
    })
  );
}