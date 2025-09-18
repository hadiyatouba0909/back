# Guide de déploiement sur Render

Ce guide vous explique comment déployer l'API backend de gestion de paie sur Render.

## Prérequis

1. Un compte Render (https://render.com)
2. Un repository Git contenant ce code
3. Une base de données MySQL (vous pouvez utiliser le service de base de données de Render ou un service externe)

## Configuration de la base de données

### Option 1: Base de données Render (recommandée)
1. Connectez-vous à votre dashboard Render
2. Cliquez sur "New +" et sélectionnez "PostgreSQL" ou utilisez un service MySQL externe
3. Configurez votre base de données et notez les informations de connexion

### Option 2: Base de données externe
Vous pouvez utiliser n'importe quel service MySQL comme PlanetScale, AWS RDS, etc.

## Déploiement du service web

1. **Créer un nouveau service web**
   - Connectez-vous à Render
   - Cliquez sur "New +" et sélectionnez "Web Service"
   - Connectez votre repository Git

2. **Configuration du service**
   - **Name**: `payroll-backend` (ou le nom de votre choix)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Branch**: `main` (ou votre branche principale)

3. **Variables d'environnement**
   Ajoutez les variables d'environnement suivantes dans la section "Environment":

   ```
   NODE_ENV=production
   PORT=10000
   
   # Base de données (utilisez DATABASE_URL si fournie par Render)
   DATABASE_URL=mysql://user:password@host:port/database
   # OU configurez individuellement:
   DB_HOST=your_db_host
   DB_PORT=3306
   DB_NAME=your_db_name
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   
   # JWT Secret (générez une clé sécurisée)
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
   
   # CORS (ajustez selon vos besoins)
   CORS_ORIGIN=*
   
   # API de devises (optionnel)
   CURRENCY_API_URL=https://api.freecurrencyapi.com/v1/latest
   CURRENCY_API_KEY=your_currency_api_key
   ```

4. **Déploiement**
   - Cliquez sur "Create Web Service"
   - Render va automatiquement déployer votre application

## Configuration de la base de données

Une fois votre service déployé, vous devez créer les tables de base de données. Voici le schéma SQL de base :

```sql
-- Table des entreprises
CREATE TABLE companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  email VARCHAR(255),
  phone VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table des utilisateurs
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  password_hash VARCHAR(255) NOT NULL,
  company_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Table des employés
CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  position VARCHAR(255) NOT NULL,
  contract VARCHAR(100) NOT NULL,
  salary_cfa DECIMAL(15,2),
  salary_usd DECIMAL(15,2),
  start_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Table des paiements
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  amount_cfa DECIMAL(15,2) NOT NULL,
  amount_usd DECIMAL(15,2) NOT NULL,
  date DATE NOT NULL,
  status ENUM('pending', 'paid', 'cancelled') DEFAULT 'paid',
  reference VARCHAR(50) UNIQUE NOT NULL,
  type ENUM('salary', 'bonus', 'overtime') DEFAULT 'salary',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Table des paramètres
CREATE TABLE settings (
  `key` VARCHAR(255) PRIMARY KEY,
  `value` TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Vérification du déploiement

1. **Test de santé**
   Accédez à `https://your-service-name.onrender.com/api/health`
   Vous devriez recevoir une réponse JSON avec le statut "ok"

2. **Test des endpoints**
   - POST `/api/auth/register` - Inscription
   - POST `/api/auth/login` - Connexion
   - GET `/api/employees` - Liste des employés (nécessite authentification)

## Domaine personnalisé (optionnel)

1. Dans votre dashboard Render, allez dans les paramètres de votre service
2. Ajoutez votre domaine personnalisé dans la section "Custom Domains"
3. Configurez vos enregistrements DNS selon les instructions de Render

## Surveillance et logs

- Les logs sont disponibles dans le dashboard Render
- Configurez des alertes pour surveiller la santé de votre application
- Le scheduler de paiements s'exécute automatiquement toutes les heures

## Sécurité

1. **Variables d'environnement**: Ne jamais commiter les fichiers .env
2. **JWT Secret**: Utilisez une clé forte et unique
3. **Base de données**: Utilisez des connexions sécurisées (SSL)
4. **CORS**: Configurez CORS_ORIGIN avec votre domaine frontend en production

## Dépannage

### Erreurs de connexion à la base de données
- Vérifiez les variables d'environnement de la base de données
- Assurez-vous que la base de données est accessible depuis Render

### Erreurs de démarrage
- Consultez les logs dans le dashboard Render
- Vérifiez que toutes les dépendances sont installées

### Problèmes de CORS
- Ajustez la variable CORS_ORIGIN selon vos besoins
- En développement, utilisez "*", en production utilisez votre domaine

## Support

Pour toute question ou problème, consultez la documentation de Render ou contactez le support technique.

