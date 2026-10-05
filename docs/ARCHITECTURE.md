# Architecture ONE PRINT

## Vue d'ensemble

```
Navigateur
│
├─ /configurateur (page Next)
│    └─ <iframe src="/configurateur-app.html">   ← document statique (2900 lignes)
│         three.js + jsPDF via CDN, i18n propre (TRANSLATIONS)
│         écrit : localStorage oneprint_cart, oneprint_lang, IndexedDB oneprint/stl
│
├─ Pages Next (Espace client) : /connexion /inscription /reinitialisation
│    /panier /mes-commandes /mon-compte          ← i18n lib/i18n (6 langues)
│
├─ /admin (back-office, FR uniquement)
│
└─ Route handlers : /api/emails/order-created, /api/emails/order-status → Resend

Supabase : Auth · Postgres (RLS) · Storage (bucket stl-files)
```

## Intégration configurateur ↔ espace client

Le configurateur est un document statique embarqué en iframe **same-origin**. La communication ne passe pas par postMessage mais par le stockage partagé :

- `localStorage.oneprint_cart` : le panier (schéma aligné sur les tables `devis` + `devis_pieces`, voir `lib/cart.ts`). Le configurateur y pousse ses lignes ; les pages Next le lisent. Chaque écriture déclenche l'événement custom `oneprint-cart-change` (sur la fenêtre parente depuis l'iframe) en complément de l'événement natif `storage`.
- `localStorage.oneprint_lang` : préférence de langue partagée (header Next et configurateur synchronisés).
- IndexedDB `oneprint`, store `stl` : binaires STL écrits à l'ajout au panier (clé `id-entrée/nom-fichier`), lus au checkout pour l'upload vers Storage, puis supprimés.
- Session Supabase : l'iframe lit la clé `sb-*-auth-token` du localStorage pour détecter l'état connecté (couplage assumé aux internes de supabase-js — voir « Risques acceptés »).
- Navigation : l'iframe navigue via `window.parent.location` (pas `window.top` : en production l'espace client est lui-même embarqué en iframe sur le site OneOrtho, cross-origin).

## Modèle de données (déduit du code — à vérifier contre l'export Supabase)

Aucune migration SQL n'est versionnée dans ce repo : le schéma ci-dessous est reconstitué depuis les requêtes du code.

- `clients` : `id`, `user_id` (auth.users), `raison_sociale`, `nom`, `email`, `telephone`, `siret`, `tva_intracom`, `type_activite`, `fonction`, `adresse_facturation` (texte libre), `adresse_livraison`, `created_at`
- `devis` : `id`, `client_id`, `numero`, `statut` (`brouillon|envoye|accepte|refuse|expire`), `montant_ht`, `tva`, `montant_ttc`, `remise`, `delai` (`std|pri|exp`), `langue`, `nature_application` (`md|proto|other`), `livraison` (`std|j1`), `nettoyage`, `dossier_lot`, `teinture_total`, `created_at`
- `devis_pieces` : `id`, `devis_id`, `nom_fichier`, `volume_mm3`, `quantite`, `prix_ht`, `finition` (`micro|lissage`), `couleur`, `storage_path`
- `commandes` : `id`, `devis_id`, `client_id`, `statut` (`en_attente|en_production|expediee|livree|annulee`), `ref_client` (n° de commande client, 50 car. max), `bon_commande_path` (PDF dans `stl-files`), `created_at`, `updated_at` (colonnes `ref_client`/`bon_commande_path` : `supabase/migrations/20261005000000_commandes_bon_commande.sql`)
- `admins` : `user_id`
- Storage bucket `stl-files` : chemins `{user_id}/{devis_id}/{index}-{nom_fichier}` (STL) et `{user_id}/bons-commande/{horodatage}-{nom_fichier}` (bons de commande PDF, un par checkout, partagé par les commandes du panier)

`montant_ht` est **net de remise** ; `remise` est le montant soustrait (l'UI reconstruit le brut par addition).

### RLS attendues (comportement dont le code dépend)

- `clients` : le client lit, crée et modifie sa propre fiche (pas de suppression).
- `devis`, `devis_pieces`, `commandes` : le client authentifié lit ses propres lignes et ne peut qu'en **créer** (aucun UPDATE/DELETE) : devis au statut `envoye`, commande au statut `en_attente` sur un devis du même client (une seule par devis), pièces uniquement sur un devis `envoye` sans commande ; `storage_path` et `bon_commande_path` doivent commencer par `{auth.uid()}/`. Les admins (présents dans `admins`) ont tous les droits (`*_admin_all`).
- `admins` : politique `admins_select_self` — chacun ne lit que sa propre ligne ; une ligne présente = l'appelant est admin (c'est le test d'autorisation des routes email et du back-office).
- Storage `stl-files` : écriture client limitée au préfixe `{user_id}/`, lecture admin (URLs signées) ; types `model/stl` et `application/pdf` uniquement, 50 Mo max.

Toute l'autorisation repose sur la RLS : le code n'utilise que la clé anon, y compris dans les route handlers (client lié au token utilisateur, `lib/supabaseServer.ts`).

## Workflow devis / commande (5 étapes)

Le checkout crée **ensemble** un `devis` (statut `envoye`) et une `commande` (statut `en_attente`). Le cycle de vie réel combine les deux statuts (`lib/admin.ts:workflowStep`) :

```
nouveau → validé → en_production → expédiée → livrée
   (devis refusé → refusé ; commande annulée → annulée)
```

- Étapes 1–2 pilotées dans /admin/devis (validation du devis, obligatoire avant production)
- Étapes 3–5 pilotées dans /admin/commandes ; `en_production`, `expediee` et `livree` déclenchent un email client (langue du devis)

Côté client (`/mes-commandes`), `clientStatusMeta` traduit la même combinaison en tracker 4 étapes.

## Checkout (lib/checkout.ts)

Non transactionnel (plusieurs requêtes REST). Idempotence : chaque entrée de panier entièrement persistée (devis + pièces + commande) est immédiatement retirée du localStorage ; un échec en milieu de panier laisse seulement les entrées non soumises et l'UI le signale (`cart.fb.errorPartial`).

## Emails (lib/email.ts)

Best-effort : jamais bloquants pour le flux métier. Client Resend REST, expéditeur `RESEND_FROM`. Emails client dans la langue du devis (6 langues), notification interne en français vers `3Dprinting@oneortho-medical.com`.

## Risques acceptés / dette connue

- **RLS partiellement versionnée** : les politiques modifiées le 2026-10-05 sont dans `supabase/migrations/` ; le schéma initial reste à exporter (`supabase db dump`).
- **Tarification côté navigateur** (risque accepté, AUD-02) : les montants sont calculés par le configurateur et enregistrés par le client ; maîtrisé par la validation manuelle admin de chaque devis avant production.
- **Lecture de session par l'iframe** : `getAuthSession()` du configurateur parse la clé localStorage de supabase-js ; une montée de version majeure peut changer ce format (l'utilisateur serait alors traité comme invité, sans perte de données).
- **Rate limiting minimal** sur `/api/emails/order-created` : seules les commandes de moins de 15 min déclenchent un envoi (pas de vrai compteur par utilisateur).
- **Pas de pagination admin** : listes plafonnées (`MAX_ROWS`/`MAX_STL_ROWS` dans `lib/admin.ts`) en attendant une vraie pagination.
- **Tarification dupliquée** dans le configurateur (`calcPrice` / `calcPiecePrice`) : deux implémentations des mêmes règles à resynchroniser à la main.
- **three.js/jsPDF via CDN** dans le configurateur : dépendance réseau tierce à chaque chargement.
- **Suppression de compte client absente** (RGPD) : nécessite une fonction côté serveur avec service-role, non implémentée.
