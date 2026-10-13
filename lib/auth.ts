// Identification simple : un cookie qui dit « qui est sur ce téléphone ».
//
// Le cookie contient l'id du membre + une signature. Sans signature, n'importe qui
// connaissant un id (ils sont visibles sur l'écran « Qui es-tu ? ») pourrait se
// fabriquer le cookie sans connaître le code famille. La signature est calculée avec
// des secrets du serveur ET le code famille : changer FAMILY_CODE déconnecte tout le monde.

import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { supabase } from "./supabase";

const COOKIE_NAME = "membre";
const ONE_YEAR = 60 * 60 * 24 * 365;

export type Member = { id: string; name: string };

function sign(memberId: string): string {
  return createHmac("sha256", process.env.SUPABASE_SECRET_KEY!)
    .update(`${memberId}:${process.env.FAMILY_CODE}`)
    .digest("base64url");
}

// Renvoie la personne connectée, ou null (pas de cookie, cookie trafiqué, membre inconnu).
export async function getCurrentMember(): Promise<Member | null> {
  const raw = (await cookies()).get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const [id, signature] = raw.split(".");
  if (!id || !signature) return null;

  const expected = Buffer.from(sign(id));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  const { data } = await supabase.from("members").select("id, name").eq("id", id).maybeSingle();
  return data;
}

// À appeler uniquement depuis une Server Action (on ne peut pas écrire de cookie ailleurs).
export async function setMemberCookie(memberId: string) {
  (await cookies()).set(COOKIE_NAME, `${memberId}.${sign(memberId)}`, {
    httpOnly: true, // illisible par le JavaScript de la page
    secure: process.env.NODE_ENV === "production", // HTTPS en ligne ; http autorisé en local
    sameSite: "lax",
    maxAge: ONE_YEAR,
    path: "/",
  });
}

export async function clearMemberCookie() {
  (await cookies()).delete(COOKIE_NAME);
}
