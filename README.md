# ONE PRINT — oneortho-print3d

Plateforme de chiffrage et de commande d'impression 3D SLS (PA2200) de OneOrtho Medical. Projet **non réglementé** (hors périmètre dispositif médical).

## Vue d'ensemble

Trois briques dans un seul déploiement Next.js (App Router) :

| Brique | Où | Description |
|---|---|---|
| Configurateur | `public/configurateur-app.html` (iframe sur `/configurateur`) | Upload STL, viewer 3D (three.js), simulation de devis, export PDF, ajout au panier |
| Espace client | `app/` (pages Next) | Inscription/connexion, panier, checkout, suivi de commandes, fiche client — i18n 6 langues |
| Back-office | `/admin` | Dashboard, devis, commandes, clients, fichiers STL — réservé à la table `admins` |

Backend : Supabase (auth, Postgres + RLS, Storage). Emails transactionnels : Resend. Hébergement : Vercel.

Voir `docs/ARCHITECTURE.md` pour le schéma des données, le workflow de commande et l'intégration configurateur ↔ espace client.

## Démarrage

```bash
npm install
cp .env.example .env.local   # puis renseigner les valeurs
npm run dev
```

Ouvrir http://localhost:3000 (redirige vers `/configurateur`).

## Variables d'environnement

| Variable | Obligatoire | Usage |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | oui | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | oui | Clé anon (toutes les requêtes passent par la RLS ; aucune clé service-role dans le code) |
| `RESEND_API_KEY` | non | Clé API Resend. Absente : les emails sont ignorés silencieusement (best-effort) |
| `RESEND_FROM` | non | Expéditeur. Défaut `onboarding@resend.dev` = sandbox : livraison uniquement vers l'adresse du compte Resend. Pour livrer réellement, vérifier un domaine sur resend.com/domains puis définir p. ex. `ONE PRINT <noreply@oneortho-medical.com>` |

## Scripts

- `npm run dev` — serveur de développement
- `npm run build` — build de production (à faire passer avant tout commit)
- `npm run lint` — ESLint

## Notes

- Cette version de Next.js diverge des conventions historiques : lire `node_modules/next/dist/docs/` avant de modifier le routage ou les APIs (cf. `AGENTS.md`).
- Le back-office `/admin` est volontairement en français uniquement (outil interne).
- L'accès admin s'accorde en insérant le `user_id` du compte dans la table `admins` (voir `docs/ARCHITECTURE.md`).
