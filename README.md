# RE-ASTR Server

Serveur backend pour l'application RE-ASTR (Automotive Software Testing Results), un système de gestion de tests et de résultats pour composants électroniques.

## 📋 Table des matières

- [Stack Technique](#-stack-technique)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Base de données](#️-base-de-données)
- [Démarrage](#-démarrage)
- [Structure du projet](#-structure-du-projet)
- [Scripts disponibles](#-scripts-disponibles)
- [Tests](#-tests)
- [Documentation API](#-documentation-api)
- [Modules](#-modules)

## 🚀 Stack Technique

- **Framework**: [NestJS](https://nestjs.com/) v11
- **HTTP Adapter**: [Fastify](https://fastify.dev/) v5 (au lieu d'Express pour de meilleures performances)
- **Base de données**: PostgreSQL
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/) v0.44
- **Authentification**: [Better Auth](https://www.better-auth.com/) v1.3
- **Validation**: class-validator + class-transformer + Zod
- **Documentation API**: Swagger/OpenAPI
- **Stockage de fichiers**: MinIO (S3-compatible)
- **Language**: TypeScript 5.9
- **Package Manager**: pnpm
- **Tests**: Jest
- **Code Quality**: ESLint, Prettier, Biome

## 📦 Prérequis

Avant de commencer, assurez-vous d'avoir installé :

- **Node.js** >= 22.0.0
- **pnpm** >= 8.0.0 (gestionnaire de packages)
- **PostgreSQL** >= 14 (ou Docker pour l'utiliser via docker-compose)
- **Docker** (optionnel, pour MinIO)

### Installation de pnpm

Si vous n'avez pas pnpm installé :

```bash
npm install -g pnpm
```

Ou via Homebrew (macOS) :

```bash
brew install pnpm
```

## 🔧 Installation

### 1. Cloner le dépôt

```bash
git clone <repository-url>
cd re-astr
```

### 2. Installer les dépendances

```bash
pnpm install
```

## ⚙️ Configuration

### 1. Créer le fichier d'environnement

Copiez le fichier `.env.example` et renommez-le en `.env` :

```bash
cp .env.example .env
```

### 2. Configurer les variables d'environnement

Éditez le fichier `.env` avec vos valeurs :

```env
# Base de données PostgreSQL
DATABASE_URL="postgresql://username:password@localhost:5432/re-astr"

# Better Auth - Secrets pour l'authentification
BETTER_AUTH_SECRET="your-secret-key-here-replace-in-production"
COOKIE_SECRET="your-cookie-secret-key-here"

# Session Configuration (optionnel - valeurs par défaut disponibles)
AUTH_SESSION_EXPIRES="604800"    # 7 jours en secondes
AUTH_SESSION_UPDATE_AGE="86400"  # 1 jour en secondes

# Email/Password Auth (optionnel - activé par défaut)
AUTH_EMAIL_PASSWORD_ENABLED="true"
AUTH_REQUIRE_EMAIL_VERIFICATION="false"

# CORS (optionnel)
AUTH_CORS_ORIGIN="true"
AUTH_CORS_CREDENTIALS="true"

# Application
BASE_URL="http://localhost:3000"
NODE_ENV="development"

# MinIO Storage (S3-compatible)
MINIO_ENDPOINT="localhost"
MINIO_PORT="9000"
MINIO_USE_SSL="false"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_DEFAULT_BUCKET="uploads"
```

### 3. Créer la base de données PostgreSQL

Si vous utilisez PostgreSQL local :

```bash
# Se connecter à PostgreSQL
psql -U postgres

# Créer la base de données
CREATE DATABASE "re-astr";

# Créer un utilisateur (optionnel)
CREATE USER your_username WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE "re-astr" TO your_username;
```

### 4. Démarrer MinIO (stockage de fichiers)

Le projet utilise MinIO pour le stockage de fichiers. Démarrez-le avec Docker Compose :

```bash
docker-compose up -d
```

MinIO sera accessible à :
- **API**: http://localhost:9000
- **Console Web**: http://localhost:9001
- **Credentials**: minioadmin / minioadmin

## 🗄️ Base de données

Le projet utilise **Drizzle ORM** avec des migrations automatiques.

### Générer les migrations

Après avoir modifié les schémas dans `/src/database/schema/` :

```bash
pnpm run db:generate
```

### Appliquer les migrations

Pour appliquer les migrations sur votre base de données :

```bash
pnpm run db:migrate
```

### Push direct (développement uniquement)

Pour synchroniser directement le schéma sans créer de fichier de migration :

```bash
pnpm run db:push
```

### Drizzle Studio (interface graphique)

Pour explorer votre base de données via une interface web :

```bash
pnpm run db:studio
```

Drizzle Studio sera accessible à : http://localhost:4983

## 🚀 Démarrage

### Mode développement (recommandé)

Lance le serveur avec rechargement automatique (watch mode) :

```bash
pnpm run start:dev
```

Le serveur démarrera sur **http://localhost:3000**

### Mode production

```bash
# 1. Builder l'application
pnpm run build

# 2. Démarrer en mode production
pnpm run start:prod
```

### Mode debug

Pour déboguer avec le debugger Node.js :

```bash
pnpm run start:debug
```

## 📁 Structure du projet

```
re-astr/
├── src/
│   ├── modules/           # Modules fonctionnels (feature modules)
│   │   ├── categories/    # Gestion des catégories de tests
│   │   ├── tests/         # Gestion des tests
│   │   └── users/         # Gestion des utilisateurs
│   ├── auth/              # Module d'authentification (Better Auth)
│   ├── database/          # Configuration Drizzle ORM
│   │   └── schema/        # Schémas de base de données
│   ├── common/            # Utilitaires partagés
│   ├── config/            # Configuration de l'application
│   ├── utils/             # Fonctions utilitaires
│   ├── app.module.ts      # Module racine
│   └── main.ts            # Point d'entrée (Fastify setup)
├── test/                  # Tests E2E
├── drizzle/               # Migrations générées
├── dist/                  # Build de production
├── .env                   # Variables d'environnement (non versionné)
├── .env.example           # Template de configuration
├── docker-compose.yml     # Configuration Docker (MinIO)
├── drizzle.config.ts      # Configuration Drizzle
├── jest.config.ts         # Configuration Jest
├── tsconfig.json          # Configuration TypeScript
└── package.json           # Dépendances et scripts
```

## 📜 Scripts disponibles

### Développement

```bash
pnpm run start:dev     # Démarrer en mode watch (rechargement automatique)
pnpm run start         # Démarrer normalement
pnpm run start:debug   # Démarrer avec debugger
pnpm run start:prod    # Démarrer en production
```

### Build

```bash
pnpm run build         # Compiler le projet TypeScript
```

### Base de données

```bash
pnpm run db:generate   # Générer les migrations Drizzle
pnpm run db:migrate    # Appliquer les migrations
pnpm run db:push       # Push direct du schéma (dev only)
pnpm run db:studio     # Ouvrir Drizzle Studio (GUI)
```

### Tests

```bash
pnpm run test          # Exécuter les tests unitaires
pnpm run test:watch    # Tests en mode watch
pnpm run test:cov      # Tests avec couverture de code
pnpm run test:debug    # Tests avec debugger
pnpm run test:e2e      # Tests end-to-end
```

### Code Quality

```bash
pnpm run lint          # Linter avec ESLint (auto-fix)
pnpm run format        # Formatter avec Prettier
```

## 🧪 Tests

Le projet utilise **Jest** pour les tests unitaires et E2E.

### Lancer tous les tests

```bash
pnpm test
```

### Tests en mode watch (développement)

```bash
pnpm test:watch
```

### Tests avec couverture de code

```bash
pnpm test:cov
```

Le rapport de couverture sera généré dans `/coverage/`.

### Tests E2E

```bash
pnpm test:e2e
```

### Convention de nommage

- Tests unitaires : `*.spec.ts` (à côté du fichier testé)
- Tests E2E : dans le dossier `/test/`
- Mock data : `*.mock.ts`

## 📚 Documentation API

La documentation interactive de l'API est générée automatiquement avec **Swagger/OpenAPI**.

Une fois le serveur démarré, accédez à :

**http://localhost:3000/api**

Vous y trouverez :
- Liste complète des endpoints
- Schémas de requêtes/réponses
- Possibilité de tester directement les API

## 🏗️ Modules

Le projet est organisé en modules NestJS :

### `categories` - Gestion des catégories

Gestion des catégories de tests avec schémas de validation personnalisés (Zod).

**Endpoints principaux** :
- `GET /categories` - Liste toutes les catégories
- `GET /categories/:id` - Récupérer une catégorie
- `POST /categories` - Créer une catégorie
- `PATCH /categories/:id` - Mettre à jour une catégorie
- `DELETE /categories/:id` - Supprimer une catégorie

### `tests` - Gestion des tests

Gestion des tests avec relations vers les catégories et fichiers.

**Endpoints principaux** :
- `GET /tests` - Liste tous les tests
- `GET /tests/:id` - Récupérer un test
- `POST /tests` - Créer un test
- `PATCH /tests/:id` - Mettre à jour un test
- `DELETE /tests/:id` - Supprimer un test

### `users` - Gestion des utilisateurs

Gestion des utilisateurs avec système de rôles (RBAC).

**Endpoints principaux** :
- `GET /users` - Liste tous les utilisateurs
- `GET /users/:id` - Récupérer un utilisateur
- `PATCH /users/:id` - Mettre à jour un utilisateur
- `DELETE /users/:id` - Supprimer un utilisateur

### `auth` - Authentification

Module d'authentification basé sur **Better Auth** avec :
- Inscription et connexion par email/password
- Gestion de sessions
- Protection des routes via guards
- Système de rôles (Admin, User, Viewer)

**Endpoints principaux** :
- `POST /api/auth/sign-up` - Inscription
- `POST /api/auth/sign-in` - Connexion
- `POST /api/auth/sign-out` - Déconnexion
- `GET /api/auth/session` - Session actuelle
