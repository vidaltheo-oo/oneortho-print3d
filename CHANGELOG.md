# Changelog ONE PRINT

## 2026-10-05 — Audit de sécurité (AUD-SEC-2026-10-05)

Rapport : `docs/audit/Rapport_audit_securite_ONEPRINT_2026-10-05.docx`.

### Sécurité

- **RLS** : le client ne peut plus modifier ni supprimer devis, pièces et commandes ; création imposée aux statuts initiaux (`envoye`, `en_attente`) ; pièces uniquement sur un devis non commandé ; suppression de fiche client réservée aux admins ; chemins Storage limités au préfixe `{user_id}/` (`supabase/migrations/20261005010000_*`, `20261005020000_*`).
- **Storage** : bucket `stl-files` limité à `model/stl` et `application/pdf`, 50 Mo.
- **Base** : `search_path` figé sur `set_updated_at`, `TRUNCATE` révoqué pour anon/authenticated, unicité de `commandes.devis_id`.
- **Emails** : `/api/emails/order-created` limité aux commandes de moins de 15 min (50 ids max).
- **En-têtes HTTP** : `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`.
- **Dépendances** : Next.js 16.2.9 → 16.3.8 (vulnérabilité critique), `npm audit` à 0.
- Risque accepté : tarification calculée côté navigateur, maîtrisée par la validation manuelle admin.

## 2026-10-05 — Bon de commande client au checkout

### Ajouté

- **Panier** : saisie facultative du n° de commande client et dépôt d'un bon de commande PDF (glisser-déposer ou sélection, 10 Mo max), traduits en 6 langues. Les deux valent pour tout le panier.
- **Checkout** : le PDF est uploadé une seule fois avant toute écriture en base (`{user_id}/bons-commande/…` dans `stl-files`) ; la référence et le chemin sont enregistrés sur chaque commande (`commandes.ref_client`, `commandes.bon_commande_path`).
- **Admin** : référence affichée sous le n° de commande et incluse dans la recherche ; section « Bon de commande client » avec téléchargement du PDF dans le panneau de détail.
- **Email interne** : n° de commande client et présence du PDF indiqués dans la notification.
- Migration à appliquer : `supabase/migrations/20261005000000_commandes_bon_commande.sql`.

## 2026-07-06 — Passe d'audit et de fiabilisation

### Corrigé (bloquant)

- **Réinitialisation de mot de passe** : le lien envoyé par « Mot de passe oublié » ramenait sur `/connexion` sans aucun handler de récupération ; il était impossible de définir un nouveau mot de passe. Nouvelle page `/reinitialisation` (événement `PASSWORD_RECOVERY` + `updateUser`), traduite en 6 langues.
- **Doublons au checkout** : un échec en milieu de panier laissait les devis/commandes déjà créés en base tout en conservant le panier entier ; re-cliquer créait des doublons. Chaque entrée persistée est maintenant retirée du panier immédiatement, et l'envoi partiel est signalé à l'utilisateur.

### Corrigé (important)

- **Écrasement de fichiers STL** : deux pièces homonymes d'un même devis partageaient le même chemin Storage (le dernier upload écrasait l'autre). Chemin désormais préfixé par l'index de pièce, nom de fichier assaini.
- **Collision d'identifiants de panier** : l'id d'une entrée était dérivé de la taille du panier ; après suppression puis ré-ajout, deux entrées pouvaient partager le même id (suppression croisée, écrasement du binaire IndexedDB). Suffixe aléatoire.
- **Récapitulatif panier** : la ligne « Remise » était soustraite d'un sous-total déjà net (sous-total = total). Le sous-total affiche désormais le brut. Les options facturées (livraison J+1, nettoyage/emballage, dossier ISO 13485, teinte) sont maintenant visibles dans le panier.
- **Langue du configurateur** : le sélecteur de l'iframe ignorait la préférence du header et repartait en français à chaque chargement. Préférence partagée `oneprint_lang` lue/écrite des deux côtés.
- **Emails client monolingues** : confirmations et statuts partaient toujours en français ; ils suivent désormais la langue du devis (6 langues). Le message de confirmation du panier ne promet plus un email (envoi best-effort).
- **Session iframe** : un access token expiré (mais rafraîchissable) faisait passer un client connecté pour un invité.

### Performance

- Back-office : vues Clients et STL chargées à l'ouverture de leur onglet (plus au login), rechargement au focus limité à 1/30 s, plafonds sur les listes (500 lignes, 1000 pièces STL).
- Checkout : uploads STL parallélisés par entrée ; barre de progression couvrant aussi les insertions.
- Configurateur : jsPDF chargé en `defer` (ne bloque plus l'affichage).

### Nettoyage

- Suppression de `index.html` racine (copie morte et divergente du configurateur servi, 102 Ko).
- Retrait de `@supabase/auth-helpers-nextjs` (dépréciée, jamais importée).
- `saveClient` fusionne `user_metadata` au lieu de l'écraser.
- Clé i18n `header.langLabel` ajoutée aux 5 langues non-FR ; feedback si le stockage navigateur est indisponible à l'ajout au panier.

### Documentation

- `README.md` réécrit (setup, variables d'environnement, périmètre).
- `docs/ARCHITECTURE.md` : schéma de données déduit du code, RLS attendues, workflow 5 étapes, intégration iframe, risques acceptés.
- `.env.example` versionné.
