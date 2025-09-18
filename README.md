# Payroll Backend (Express + MySQL)

API backend pour l’interface front-payroll. Stack: Node.js (Express), MySQL, JWT, et intégration de conversion de devises via FreeCurrencyAPI.

## Prérequis
- Node.js 18+
- MySQL 8+
- Un compte FreeCurrencyAPI et une clé API

## Installation
```bash
cd backend
bun install || npm install || yarn install
```

## Configuration
1. Créez un fichier `.env` à partir de `.env.example`:
```
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=payroll_db
JWT_SECRET=change_this_secret
CORS_ORIGIN=http://localhost:8080
CURRENCY_API_KEY=your_freecurrencyapi_key
CURRENCY_API_URL=https://api.freecurrencyapi.com/v1/latest
```

2. Créez la base de données `payroll_db` (si nécessaire) et appliquez le schéma:
```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS payroll_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p payroll_db < db/schema.sql
# Optionnel: données de démonstration
mysql -u root -p payroll_db < db/seed.sql
```

## Démarrage
```bash
# Dev avec reload
npm run dev
# Prod
npm start
```

L’API s’exécute par défaut sur http://localhost:5000

## Endpoints
- Authentification
  - POST /api/auth/register
  - POST /api/auth/login
  - GET  /api/auth/me (JWT requis)

- Employés (JWT requis)
  - GET    /api/employees
  - GET    /api/employees/:id
  - POST   /api/employees
  - PUT    /api/employees/:id
  - DELETE /api/employees/:id

- Paiements (JWT requis)
  - GET    /api/payments
  - GET    /api/payments/:id
  - POST   /api/payments
  - PUT    /api/payments/:id
  - DELETE /api/payments/:id

- Paramètres (JWT requis)
  - GET  /api/settings/exchange-rate
  - PUT  /api/settings/exchange-rate

- Devises (JWT requis)
  - GET  /api/currency/rates?base=USD&symbols=XOF,EUR
  - GET  /api/currency/convert?from=USD&to=XOF&amount=100

## Intégration Front
Configurez le frontend pour cibler `http://localhost:5000` et utilisez le token JWT retourné par `/api/auth/login` pour les requêtes protégées (header `Authorization: Bearer <token>`).

## Sécurité
- Ne commitez jamais votre `.env` avec des secrets.
- Le JWT expire après 7 jours par défaut.
- CORS est autorisé pour `CORS_ORIGIN` (par défaut `http://localhost:8080`).

## Notes
- Les montants en CFA sont considérés en XOF.
- L’API de conversion met en cache les taux pendant 10 minutes.
# backend_saraya_payroll
# backend_saraya_payroll
# back
