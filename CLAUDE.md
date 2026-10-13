# App « Traitement du chat »

## Contexte

Mini-app perso pour coordonner, entre 3 personnes d'une même famille (Fabio, Maman, Tommy),
le traitement que le chat doit prendre deux fois par jour : vers 7h (matin) et vers 19h (soir).
Le chat peut être à **Mandelieu** ou à **Pégomas** selon les jours.

L'utilisateur (Fabio) n'a pas codé depuis un moment : **explique toujours en français, simplement,
ce que fait chaque fichier que tu crées ou modifies**, et pourquoi. Pas de jargon non expliqué.

## Contraintes

- **Coût zéro** : Vercel Hobby + Supabase gratuit uniquement. Aucun service payant, aucun service
  tiers supplémentaire (pas de Firebase, pas d'OneSignal, etc.).
- Doit fonctionner sur **Android (Pixel 6a, Chrome)** et **iPhone (Safari, app ajoutée à l'écran
  d'accueil, iOS 16.4+)** → c'est une **PWA** avec notifications **Web Push** standard.
- Interface **en français**, **mobile-first**, gros boutons, très simple (la mère doit s'en servir
  sans explication). Mode clair et sombre.
- Pas de librairie UI lourde : Tailwind suffit.
- Code lisible et commenté plutôt que « malin ».

## Stack déjà en place

- Next.js 16 (App Router, TypeScript, Tailwind), **sans** dossier `src/`, alias `@/*`.
- `lib/supabase.ts` : client Supabase **côté serveur uniquement** (clé secrète). Ne jamais l'importer
  dans un composant client.
- `lib/push.ts` : fonction `notify(payload, exceptMemberId?)` qui envoie une notification à tous les
  abonnés sauf `exceptMemberId`. Ne pas changer sa signature.
- `app/api/test/route.ts` : route de test, **à supprimer**.
- `.env.local` (ne jamais le lire, l'afficher ni le modifier) contient :
  `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
  `VAPID_SUBJECT`, `FAMILY_CODE`, `CRON_SECRET`.

## Base de données (Supabase, déjà créée)

RLS activé **sans aucune policy** : le navigateur n'accède jamais directement à la base.
Toute lecture/écriture passe par le serveur Next.js (Server Components, Server Actions, Route Handlers).

- `members(id uuid, name text, created_at)` — 3 lignes : Fabio, Maman, Tommy.
- `treatments(id uuid, date date, slot 'matin'|'soir', location 'mandelieu'|'pegomas',
  done_by uuid null, done_at timestamptz null, done_comment text null)` — une ligne par créneau,
  `unique(date, slot)`.
- `availabilities(treatment_id, member_id, status 'dispo'|'indispo', comment text null, updated_at)`
  — PK `(treatment_id, member_id)` → faire un **upsert**.
- `comment` et `done_comment` : texte libre facultatif, **100 caractères max** (contrainte SQL
  `char_length <= 100`).
- `activity_log(id, member_id, treatment_id, action 'dispo'|'indispo'|'fait'|'lieu', detail text,
  created_at)` — historique affiché dans l'app.
- `push_subscriptions(endpoint PK, member_id, p256dh, auth, created_at)`.
- Fonction SQL `ensure_treatments(days int default 14)` : crée les créneaux manquants des N prochains
  jours, chacun reprenant le lieu du créneau précédent. L'appeler via `supabase.rpc` au chargement
  de la page d'accueil.

Affichage des lieux : `mandelieu` → « Mandelieu », `pegomas` → « Pégomas ».

## Fuseau horaire — important

Le serveur Vercel tourne en **UTC**. Toute notion de « aujourd'hui », « maintenant », « matin/soir »
doit être calculée en **Europe/Paris** (via `Intl.DateTimeFormat` avec `timeZone: "Europe/Paris"`),
dans un petit utilitaire `lib/time.ts`.

## Identification (simple, sans compte)

- Au premier lancement : écran « Qui es-tu ? » avec les 3 prénoms + champ « Code famille ».
- Server Action qui vérifie le code contre `FAMILY_CODE`, puis pose un cookie `httpOnly`, `secure`,
  `sameSite=lax`, durée 1 an, contenant l'id du membre.
- Toutes les Server Actions vérifient ce cookie (et que le membre existe) avant d'agir.
- Possibilité de « Changer de personne » (supprime le cookie).

## Fonctionnalités

### Écran d'accueil
- En haut : le **prochain traitement** = le matin du jour (heure de Paris) s'il n'est pas fait et
  qu'il est avant 13h, sinon le soir du jour, sinon le matin du lendemain.
- Grande carte pour ce traitement :
  - date + créneau (« Ce soir · 19h »), **lieu bien visible** (badge Mandelieu / Pégomas) ;
  - statut de chacun : Dispo / Pas dispo / Pas encore répondu ;
  - si fait : « ✅ Fait par Maman à 19h04 » + bouton discret « Annuler » ;
  - boutons : **Je suis dispo**, **Pas dispo**, **Traitement fait**, **Changer le lieu**.
- En dessous : les créneaux des ~3 jours suivants en version compacte, avec les mêmes actions
  (on doit pouvoir se dire dispo / pas dispo ou changer le lieu à l'avance).
- En bas : historique des 20 dernières actions (`activity_log`), en langage naturel
  (« Tommy est dispo pour demain matin · il y a 5 min »).

### Commentaires
- Avec **Je suis dispo**, **Pas dispo** et **Traitement fait**, on peut ajouter un commentaire court
  facultatif (ex. « Je commence à 5h », « J'arrive à 20h », « Il a bien mangé »).
- Interface : après avoir appuyé sur le bouton, un petit panneau s'ouvre avec un champ texte
  (compteur « 0/100 »), quelques **suggestions en un clic** (« J'arrive à 20h », « Je pars tôt »,
  « Peut-être », « Je confirme plus tard ») qui remplissent le champ, et un bouton **Valider**.
  On peut valider sans commentaire.
- On peut modifier son commentaire ensuite (re-cliquer sur son statut actuel rouvre le panneau,
  pré-rempli).
- Côté serveur : `trim()`, chaîne vide → `null`, refuser au-delà de 100 caractères. Texte
  affiché tel quel (React échappe déjà le HTML, ne jamais utiliser `dangerouslySetInnerHTML`).
- Affichage : sous le statut de la personne, en petit et en italique
  (« Tommy · Pas dispo — *J'arrive à 20h* ») ; sous « ✅ Fait par… » pour `done_comment`.
- Annuler un traitement fait remet aussi `done_comment` à `null`.
- Le commentaire est repris dans la notification et dans `activity_log.detail`.

### Changer le lieu
- Choix Mandelieu / Pégomas.
- Portée : « Ce traitement seulement » ou « Jusqu'au… » (choix d'un jour + créneau) → met à jour
  tous les créneaux entre celui-ci et celui choisi, inclus.

### Notifications (via `notify`, en excluant la personne qui agit)
- Dispo : « Tommy est dispo pour ce soir (Pégomas) »
- Pas dispo : « Maman n'est pas dispo pour demain matin »
- Fait : « ✅ Fabio a donné le traitement du soir »
- Avec un commentaire, on l'ajoute à la fin : « Maman n'est pas dispo pour ce soir : J'arrive à 20h »
- Modification du commentaire seul (statut inchangé) : « 💬 Tommy (ce soir) : Je confirme plus tard »
- Annulation : « Le traitement du soir n'est finalement pas marqué comme fait »
- Lieu : « 📍 Le chat sera à Pégomas jusqu'à jeudi soir »
- Chaque action écrit aussi une ligne dans `activity_log`.

### Rappels automatiques — `app/api/reminder/route.ts`
- Route `GET` protégée par l'en-tête `Authorization: Bearer <CRON_SECRET>` (sinon 401).
- Elle sera appelée **toutes les heures à la minute 30** (pg_cron, configuré plus tard). Elle calcule
  l'heure de Paris et n'agit qu'à ces moments (sinon renvoie `{ skipped: true }`) :
  - **6h30** et **18h30** (avant le créneau) : si quelqu'un est dispo → notifier tout le monde
    « Rappel : Tommy s'occupe du traitement de 7h (Mandelieu) » (avec son commentaire s'il y en a
    un) ; si personne → « ⚠️ Personne ne
    s'est déclaré dispo pour le traitement de 7h (Mandelieu) ».
  - **7h30** et **19h30** (après) : si le traitement n'est pas marqué fait → « ⏰ Le traitement de 7h
    n'est pas encore marqué comme fait ». Sinon rien.
- Appeler aussi `ensure_treatments(14)` à chaque exécution.

### PWA et notifications push
- `app/manifest.ts` (nom « Traitement chat », `display: standalone`, couleurs, icônes 192 et 512
  dans `public/`, icône simple générée).
- `public/sw.js` : service worker qui écoute `push` (affiche titre + corps) et `notificationclick`
  (ouvre / remet au premier plan l'app).
- Enregistrement du service worker côté client.
- Bouton « Activer les notifications » (la demande de permission doit venir d'un clic, obligatoire
  sur iPhone) → `pushManager.subscribe` avec la clé publique VAPID → Server Action qui enregistre
  l'abonnement dans `push_subscriptions` pour le membre connecté.
- Sur iPhone, si l'app n'est pas lancée depuis l'écran d'accueil (pas en mode standalone), afficher
  un encart expliquant : Safari → Partager → « Sur l'écran d'accueil », puis ouvrir l'app depuis
  l'icône.
- Petit bouton « Envoyer une notif de test » (seulement à soi-même) pour vérifier que ça marche.

## Façon de travailler

- Avancer par étape, comme demandé dans le message. Avant de coder, présenter le plan (liste des
  fichiers à créer/modifier). Après, expliquer chaque fichier simplement.
- Vérifier que `npm run build` passe sans erreur à la fin de chaque étape.
- Faire un commit Git à la fin de chaque étape, avec un message clair en français.
