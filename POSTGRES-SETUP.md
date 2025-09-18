# Démarrage Backend avec PostgreSQL

## Prérequis
- Node.js 18+ (ou 20+)
- PostgreSQL 13+

## 1) Variables d’environnement
Le fichier `.env` est déjà créé à la racine du backend (`back/.env`).

Champs importants:
- PORT=5000
- CORS_ORIGIN=http://localhost:8080
- JWT_SECRET=...
- JWT_EXPIRES_IN=7d
- PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
- CURRENCY_API_KEY, CURRENCY_API_URL

## 2) Installer les dépendances
```
npm install
```

## 3) Créer les tables et insérer les données de test
```
npm run db:setup
```
Ce script applique `db/schema.pg.sql` puis `db/seed.pg.sql`.

## 4) Tester la connexion à la base
```
npm run db:test
```

## 5) Lancer l’API
```
npm run dev
# ou
npm start
```
API par défaut: http://localhost:5000

## 6) Endpoints utiles
- Santé: GET `/api/health`
- Auth: POST `/api/auth/register`, POST `/api/auth/login`
- Employés: CRUD `/api/employees`
- Paiements: CRUD `/api/payments`
- Devises: GET `/api/currency/rates`, `/api/currency/convert`

## Remarques techniques
- Le pool PostgreSQL est dans `src/utils/db.js`. Les placeholders `?` (tableaux) et `:nom` (objets) sont supportés.
- Les requêtes MySQL spécifiques ont été adaptées (to_char, UPDATE/DELETE avec FROM, split_part, ON CONFLICT...).
- Le schéma PostgreSQL crée des colonnes générées `payment_month` et `salary_month` compatibles avec les requêtes existantes, et une contrainte d’unicité `(employee_id, salary_month)`.
