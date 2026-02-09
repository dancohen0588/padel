# Le Tournoi des Frérots — Module 1.1

Stack : Next.js 14 (App Router) + Tailwind + shadcn/ui + database (Neon Postgres).

## Démarrer en local

```bash
npm install
npm run dev
```

## Variables d’environnement

Créer un fichier `.env.local` à la racine :

```
DATABASE_URL=...
ADMIN_TOKEN=... # token simple pour l’admin
```

## Database (schema + seed)

1) Créer une base Neon Postgres
2) Exécuter le schéma :

```sql
-- fichier database/schema.sql
```

3) Seed du tournoi actif + photos :

```sql
-- fichier database/seed.sql
```

## Pages disponibles

- `/` : landing
- `/inscription` : formulaire joueur
- `/tournoi/en-cours` : joueurs validés
- `/admin/inscriptions?token=ADMIN_TOKEN` : back-office

## Sécurité MVP

- Les actions admin sont protégées par `ADMIN_TOKEN` côté serveur.
- Les lectures publiques passent par la database.

## Test manuel (checklist)

1. Créer un tournoi actif via `database/seed.sql`.
2. Aller sur `/inscription` et soumettre un joueur.
3. Aller sur `/admin/inscriptions?token=ADMIN_TOKEN` et valider l’inscription.
4. Vérifier que le joueur apparaît sur `/tournoi/en-cours`.
