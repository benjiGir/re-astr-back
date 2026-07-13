# API Contracts Documentation

> Documentation complète des contrats d'interface REST API pour le frontend
> **Version**: 1.0.0
> **Base URL**: `http://localhost:3000` (développement)

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Authentication](#authentication)
3. [Types de base](#types-de-base)
4. [Système de validation dynamique](#système-de-validation-dynamique)
5. [Projects API](#projects-api)
6. [Categories API](#categories-api)
7. [Tests API](#tests-api)
8. [Test Files API](#test-files-api)
9. [Users API](#users-api)
10. [Gestion des erreurs](#gestion-des-erreurs)
11. [Exemples complets](#exemples-complets)

---

## Vue d'ensemble

### Architecture

- **Framework**: NestJS avec Fastify
- **Authentification**: Cookie-based sessions (Better Auth)
- **Format**: JSON
- **Validation**: Dynamic schema validation avec Zod

### Authentification

Toutes les routes (sauf `/auth/*`) nécessitent une session valide. Le cookie de session `better-auth.session_token` est automatiquement envoyé par le navigateur.

### Roles et permissions

| Role | Permissions |
|------|-------------|
| `user` | Lecture uniquement |
| `contributor` | Lecture + Création de tests |
| `archivist` | Toutes les permissions sauf gestion des utilisateurs |
| `master` | Toutes les permissions |

---

## Authentication

### Types communs

```typescript
interface User {
  id: string
  email: string
  name?: string
  emailVerified: boolean
  role: 'user' | 'contributor' | 'archivist' | 'master'
  createdAt: Date
  updatedAt: Date
}

interface Session {
  id: string
  expiresAt: Date
  token: string
  ipAddress?: string
  userAgent?: string
}

interface AuthResponse {
  user: User
  session: Session
}
```

### POST `/auth/sign-up/email`

Créer un nouveau compte utilisateur.

**Request Body:**
```typescript
{
  email: string       // Email valide
  password: string    // Min 8 caractères
  name?: string       // Optionnel
}
```

**Response:** `201 Created`
```typescript
{
  user: User
  session: Session
}
```

**Erreurs:**
- `400` - Données invalides
- `409` - Email déjà utilisé

---

### POST `/auth/sign-in/email`

Connexion utilisateur.

**Request Body:**
```typescript
{
  email: string
  password: string
}
```

**Response:** `200 OK`
```typescript
{
  user: User
  session: Session
}
```

**Erreurs:**
- `401` - Identifiants invalides

---

### POST `/auth/sign-out`

Déconnexion et suppression de la session.

**Headers:** Cookie de session requis

**Response:** `200 OK`
```typescript
{
  success: true
}
```

**Erreurs:**
- `401` - Non authentifié

---

### GET `/auth/get-session`

Récupérer la session courante.

**Headers:** Cookie de session requis

**Response:** `200 OK`
```typescript
{
  user: User
  session: Session
}
```

**Erreurs:**
- `401` - Non authentifié

---

### POST `/auth/forgot-password`

Demander un lien de réinitialisation de mot de passe.

**Request Body:**
```typescript
{
  email: string
  redirectTo?: string  // URL de redirection après reset
}
```

**Response:** `200 OK`
```typescript
{
  message: "Password reset email sent"
  success: true
}
```

---

### POST `/auth/reset-password`

Réinitialiser le mot de passe avec un token.

**Request Body:**
```typescript
{
  newPassword: string  // Min 8 caractères
  token: string        // Token reçu par email
}
```

**Response:** `200 OK`
```typescript
{
  message: "Password successfully reset"
  success: true
}
```

**Erreurs:**
- `400` - Token invalide ou expiré

---

## Types de base

### Schema Types

```typescript
// Types de champs supportés
type FieldType =
  | 'text'      // Texte simple
  | 'number'    // Nombre (integer ou float)
  | 'boolean'   // true/false
  | 'date'      // ISO 8601 string
  | 'email'     // Email validé
  | 'url'       // URL validée (http/https)
  | 'array'     // Tableau de valeurs
  | 'object'    // Objet imbriqué

// Règles de validation pour un champ
interface FieldValidation {
  // Pour number
  min?: number
  max?: number

  // Pour text/email/url
  minLength?: number
  maxLength?: number
  pattern?: string         // Regex pattern
  enum?: string[]          // Valeurs autorisées

  // Pour array
  minItems?: number
  maxItems?: number
  itemType?: FieldType     // Type des éléments

  // Pour object
  properties?: Record<string, FieldDefinition>  // Structure imbriquée
}

// Définition d'un champ
interface FieldDefinition {
  key: string                    // Clé unique du champ
  label: string                  // Label affiché à l'utilisateur
  type: FieldType                // Type du champ
  required: boolean              // Champ obligatoire?
  validation?: FieldValidation   // Règles de validation
  defaultValue?: any             // Valeur par défaut
}

// Schéma des champs communs d'une catégorie
interface BaseSchema {
  fields: FieldDefinition[]
}

// Schéma des champs personnalisés
interface CustomFieldsSchema {
  allowCustomFields: boolean              // Autoriser des champs custom?
  maxCustomFields?: number                // Limite de champs custom
  allowedTypes?: FieldType[]              // Types autorisés pour les custom fields
  fields: FieldDefinition[]               // Champs custom prédéfinis
}
```

---

## Système de validation dynamique

### Principe

Chaque **catégorie** définit deux schémas :

1. **baseSchema** : Champs **communs obligatoires** pour tous les tests de cette catégorie
2. **customFieldsSchema** : Règles pour les **champs personnalisés** optionnels

### Exemple : Catégorie "Tests de Température"

```typescript
{
  name: "Tests de Température",
  description: "Validation thermique des composants",

  // Champs COMMUNS à tous les tests de cette catégorie
  baseSchema: {
    fields: [
      {
        key: "temperature",
        label: "Température (°C)",
        type: "number",
        required: true,
        validation: { min: -50, max: 150 }
      },
      {
        key: "duration",
        label: "Durée (heures)",
        type: "number",
        required: true
      },
      {
        key: "result",
        label: "Résultat",
        type: "text",
        required: true,
        validation: {
          enum: ["Pass", "Fail", "Inconclusive"]
        }
      }
    ]
  },

  // Règles pour les champs CUSTOM (ajoutés par l'utilisateur)
  customFieldsSchema: {
    allowCustomFields: true,
    maxCustomFields: 10,
    allowedTypes: ["text", "number", "boolean"],  // Types autorisés
    fields: []  // Pas de champs custom prédéfinis pour l'instant
  }
}
```

### Validation côté frontend

Le frontend doit :

1. **Lors de la création d'un test** :
   - Récupérer la catégorie via `GET /categories/:id`
   - Afficher les champs du `baseSchema` (obligatoires)
   - Permettre l'ajout de champs custom selon `customFieldsSchema`

2. **Validation avant envoi** :
   - Tous les champs `baseSchema` obligatoires doivent être remplis
   - Les types doivent correspondre
   - Les contraintes de validation doivent être respectées
   - Les champs custom doivent respecter `allowedTypes` et `maxCustomFields`

---

## Projects API

### Types

```typescript
interface Project {
  id: string
  name: string                  // Nom unique du projet
  description?: string
  createdAt: Date
  updatedAt: Date
}

interface CreateProjectDto {
  name: string                  // Obligatoire, doit être unique
  description?: string
}

interface UpdateProjectDto {
  name?: string                 // Si fourni, doit rester unique
  description?: string
}
```

---

### GET `/projects`

Récupérer tous les projets.

**Auth:** Session requise
**Roles:** Tous

**Response:** `200 OK`
```typescript
Project[]
```

**Exemple:**
```typescript
[
  {
    id: "proj-123",
    name: "Avionics System Validation",
    description: "Comprehensive testing program for next-generation avionics components",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  },
  {
    id: "proj-456",
    name: "Automotive Electronics Certification",
    description: "Testing automotive electronic components for ISO 26262 compliance",
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z"
  }
]
```

---

### GET `/projects/:id`

Récupérer un projet par ID.

**Auth:** Session requise
**Roles:** Tous

**Response:** `200 OK`
```typescript
Project
```

**Erreurs:**
- `404` - Projet non trouvé

---

### POST `/projects`

Créer un nouveau projet.

**Auth:** Session requise
**Roles:** `contributor` ou supérieur

**Request Body:**
```typescript
{
  name: string           // Nom unique obligatoire
  description?: string   // Description optionnelle
}
```

**Response:** `201 Created`
```typescript
Project
```

**Exemple de requête:**
```json
{
  "name": "Medical Device Qualification",
  "description": "Safety and reliability testing for medical electronic devices"
}
```

**Erreurs:**
- `400` - Données invalides (nom vide, trop long, etc.)
- `403` - Permissions insuffisantes
- `409` - Un projet avec ce nom existe déjà

---

### PATCH `/projects/:id`

Mettre à jour un projet.

**Auth:** Session requise
**Roles:** `archivist` ou supérieur

**Request Body:** (tous les champs optionnels)
```typescript
{
  name?: string
  description?: string
}
```

**Response:** `200 OK`
```typescript
Project
```

**Erreurs:**
- `400` - Données invalides
- `403` - Permissions insuffisantes
- `404` - Projet non trouvé
- `409` - Le nouveau nom est déjà utilisé par un autre projet

---

### DELETE `/projects/:id`

Supprimer un projet.

⚠️ **BUG CONNU**: la contrainte FK `tests.projectId` est en `ON DELETE RESTRICT`, donc la suppression d'un projet avec des tests associés échoue bien en base — mais le service ne capte pas cette violation. Le frontend recevra une erreur **500 non formatée** (pas un 409 propre). Ne pas coder de gestion spécifique du 409 tant que ce n'est pas corrigé côté backend.

**Auth:** Session requise
**Roles:** `archivist` ou supérieur

**Response:** `204 No Content`

**Erreurs:**
- `403` - Permissions insuffisantes
- `404` - Projet non trouvé
- `500` - Le projet a des tests associés (violation FK non gérée, voir bug connu ci-dessus)

---

## Categories API

### Types

```typescript
interface Category {
  id: string
  name: string
  description?: string
  baseSchema: BaseSchema
  customFieldsSchema: CustomFieldsSchema
  createdAt: Date
  updatedAt: Date
}

interface CreateCategoryDto {
  name: string
  description?: string
  baseSchema: BaseSchema
  customFieldsSchema?: CustomFieldsSchema  // Défaut: allowCustomFields=true, maxCustomFields=10
}

interface UpdateCategoryDto {
  name?: string
  description?: string
  baseSchema?: BaseSchema
  customFieldsSchema?: CustomFieldsSchema
}
```

---

### GET `/categories`

Récupérer toutes les catégories.

**Auth:** Session requise
**Roles:** Tous

**Response:** `200 OK`
```typescript
Category[]
```

**Exemple:**
```typescript
[
  {
    id: "cat-123",
    name: "Tests de Température",
    description: "Validation thermique",
    baseSchema: { fields: [...] },
    customFieldsSchema: { allowCustomFields: true, ... },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  }
]
```

---

### GET `/categories/:id`

Récupérer une catégorie par ID.

**Auth:** Session requise
**Roles:** Tous

**Response:** `200 OK`
```typescript
Category
```

**Erreurs:**
- `404` - Catégorie non trouvée

---

### POST `/categories`

Créer une nouvelle catégorie.

**Auth:** Session requise
**Roles:** `contributor` ou supérieur

**Request Body:**
```typescript
{
  name: string
  description?: string
  baseSchema: {
    fields: FieldDefinition[]
  }
  customFieldsSchema?: {
    allowCustomFields: boolean
    maxCustomFields?: number
    allowedTypes?: FieldType[]
    fields: FieldDefinition[]
  }
}
```

**Response:** `201 Created`
```typescript
Category
```

**Erreurs:**
- `400` - Schema invalide (la structure du schema ne respecte pas les contraintes)
- `403` - Permissions insuffisantes

---

### PATCH `/categories/:id`

Mettre à jour une catégorie.

**Auth:** Session requise
**Roles:** `archivist` ou supérieur

**Request Body:** (tous les champs optionnels)
```typescript
{
  name?: string
  description?: string
  baseSchema?: BaseSchema
  customFieldsSchema?: CustomFieldsSchema
}
```

**Response:** `200 OK`
```typescript
Category
```

**Erreurs:**
- `400` - Schema invalide
- `403` - Permissions insuffisantes
- `404` - Catégorie non trouvée

---

### DELETE `/categories/:id`

Supprimer une catégorie.

**Auth:** Session requise
**Roles:** `archivist` ou supérieur

**Response:** `204 No Content`

**Erreurs:**
- `403` - Permissions insuffisantes
- `404` - Catégorie non trouvée

---

## Tests API

### Types

```typescript
type TestStatus = 'draft' | 'in_progress' | 'completed' | 'failed' | 'archived'

interface Test {
  id: string
  projectId: string                  // ID du projet (obligatoire)
  categoryId: string
  name: string
  description?: string
  status: TestStatus
  commonData: Record<string, any>    // Données des champs baseSchema
  customData: Record<string, any>    // Données des champs custom
  metadata?: Record<string, any>     // Métadonnées libres
  createdBy: string                  // User ID
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

interface CreateTestDto {
  projectId: string                // ID du projet (obligatoire)
  categoryId: string
  name: string
  description?: string
  status?: TestStatus              // Défaut: 'draft'
  commonData: Record<string, any>
  customData?: Record<string, any>
  metadata?: Record<string, any>
}

interface UpdateTestDto {
  name?: string
  description?: string
  status?: TestStatus
  commonData?: Record<string, any>
  customData?: Record<string, any>
  metadata?: Record<string, any>
}
```

---

### GET `/tests`

Récupérer tous les tests (avec filtrage optionnel).

**Auth:** Session requise
**Roles:** Tous

**Query Parameters:**
- `categoryId?: string` - Filtrer par catégorie

⚠️ Il n'y a **pas** de filtre `projectId` malgré `projectId` étant une FK obligatoire sur `Test` — ni le controller ni le repository ne l'implémentent actuellement.

**Response:** `200 OK`
```typescript
Test[]
```

**Exemples:**
```bash
GET /tests
GET /tests?categoryId=cat-123
```

---

### GET `/tests/:id`

Récupérer un test par ID.

**Auth:** Session requise
**Roles:** Tous

**Response:** `200 OK`
```typescript
Test
```

**Erreurs:**
- `404` - Test non trouvé

---

### POST `/tests`

Créer un nouveau test.

**Auth:** Session requise
**Roles:** `contributor` ou supérieur

**Request Body:**
```typescript
{
  projectId: string               // ID du projet (obligatoire)
  categoryId: string              // ID de la catégorie
  name: string
  description?: string
  status?: 'draft' | 'in_progress' | 'completed' | 'failed'

  // Données des champs du baseSchema de la catégorie
  commonData: {
    [key: string]: any            // Clés définies dans category.baseSchema
  }

  // Données des champs personnalisés
  customData?: {
    [key: string]: any            // Doit respecter category.customFieldsSchema
  }

  // Métadonnées libres
  metadata?: {
    [key: string]: any
  }
}
```

**Response:** `201 Created`
```typescript
Test
```

**Erreurs:**
- `400` - Validation échouée (commonData ou customData invalides)
- `403` - Permissions insuffisantes
- `404` - Projet ou catégorie non trouvé(e)

**Détails de validation:**

Le backend valide automatiquement :

1. **commonData** contre `category.baseSchema` :
   - Tous les champs `required: true` doivent être présents
   - Les types doivent correspondre
   - Les règles de validation (`min`, `max`, `enum`, etc.) sont appliquées

2. **customData** contre `category.customFieldsSchema` :
   - Si `allowCustomFields: false`, customData doit être vide
   - Respect de `maxCustomFields`
   - Les types des champs custom doivent être dans `allowedTypes`
   - Les champs prédéfinis dans `customFieldsSchema.fields` sont validés

---

### PATCH `/tests/:id`

Mettre à jour un test.

**Auth:** Session requise
**Roles:** `contributor` ou supérieur

**Request Body:** (tous les champs optionnels)
```typescript
{
  name?: string
  description?: string
  status?: TestStatus
  commonData?: Record<string, any>
  customData?: Record<string, any>
  metadata?: Record<string, any>
}
```

**Response:** `200 OK`
```typescript
Test
```

**Erreurs:**
- `400` - Validation échouée
- `403` - Permissions insuffisantes
- `404` - Test non trouvé

---

### DELETE `/tests/:id`

Supprimer un test.

**Auth:** Session requise
**Roles:** `archivist` ou supérieur

**Response:** `204 No Content`

**Erreurs:**
- `403` - Permissions insuffisantes
- `404` - Test non trouvé

---

## Test Files API

### Types

```typescript
type FileType = 'screenshot' | 'report' | 'documentation' | 'other'

interface TestFile {
  id: string
  testId: string
  fileType: FileType
  originalFilename: string
  storedFilename: string
  bucketName: string          // toujours 'test-archives' actuellement
  objectKey: string           // clé S3/MinIO, partitionnée par date: tests/{year}/{month}/{storedFilename}
  fileSize: number            // bytes, taille rapportée par MinIO (pas la taille brute du buffer)
  mimeType: string
  checksum?: string           // SHA-256
  metadata?: Record<string, any>
  uploadedBy: string          // User ID
  uploadedAt: Date
  expiresAt?: Date
}
```

Un `TestFile` référence toujours un `Test` existant (`testId` obligatoire, vérifié en base par le service à chaque opération). La suppression d'un `Test` supprime en cascade ses `TestFile` **en base**, mais ne supprime PAS l'objet correspondant sur MinIO — fuite de stockage potentielle à surveiller.

---

### POST `/test-files/upload`

Upload d'un fichier (multipart/form-data) et création de la métadonnée associée.

**Auth:** Session requise
**Roles:** `contributor` ou supérieur
**Content-Type:** `multipart/form-data`
**Limites serveur:** 50 MB par fichier, 10 fichiers max par requête

**Response:** `201 Created`
```typescript
TestFile
```

**Erreurs:**
- `400` - Fichier manquant ou invalide
- `403` - Permissions insuffisantes
- `404` - Test non trouvé

⚠️ **BUG CONNU**: le controller injecte `@User()`, qui lit `request.user` — jamais peuplé par aucun guard/middleware. Cet endpoint lève actuellement une `TypeError` à l'exécution (`user.id` sur `undefined`). À corriger avant d'intégrer côté frontend.

---

### GET `/test-files?testId=`

Lister les fichiers d'un test.

**Auth:** Session requise
**Roles:** Tous

**Query Parameters:**
- `testId?: string` - Filtrer par test

**Response:** `200 OK`
```typescript
TestFile[]
```

---

### GET `/test-files/:id`

Récupérer la métadonnée d'un fichier.

**Auth:** Session requise
**Roles:** Tous

**Response:** `200 OK`
```typescript
TestFile
```

---

### GET `/test-files/:id/download`

Télécharge le contenu binaire du fichier (stream).

**Auth:** Session requise
**Roles:** Tous (aucune restriction de rôle sur cet endpoint)

**Response:** `200 OK` — flux binaire, `Content-Type` = `mimeType` du fichier

---

### GET `/test-files/:id/presigned-url?expirySeconds=`

Génère une URL pré-signée MinIO pour accès direct au fichier.

**Auth:** Session requise
**Roles:** Tous

**Query Parameters:**
- `expirySeconds?: number` - Durée de validité (défaut: 3600)

**Response:** `200 OK`
```typescript
{ url: string }
```

---

### PATCH `/test-files/:id`

Met à jour la métadonnée d'un fichier (pas le contenu binaire).

**Auth:** Session requise
**Roles:** `contributor` ou supérieur

**Response:** `200 OK`
```typescript
TestFile
```

---

### DELETE `/test-files/:id`

Supprime le fichier (MinIO + métadonnée).

**Auth:** Session requise
**Roles:** `archivist` ou supérieur

**Response:** `204 No Content`

⚠️ **BUG CONNU**: si la suppression MinIO échoue, l'erreur n'est que loguée (`console.error`, pas le logger structuré) et la ligne en base est supprimée quand même — l'objet peut rester orphelin sur le storage.

---

## Users API

### Types

```typescript
interface User {
  id: string
  name?: string
  email: string
  emailVerified: boolean
  image?: string
  role: 'user' | 'contributor' | 'archivist' | 'master'
  createdAt: Date
  updatedAt: Date
}

interface UpdateUserDto {
  name?: string
  email?: string
  image?: string
  emailVerified?: boolean
}

interface AssignRoleDto {
  role: 'user' | 'contributor' | 'archivist' | 'master'
}
```

---

### GET `/users`

Lister tous les utilisateurs.

**Auth:** Session requise
**Roles:** Tous

**Response:** `200 OK`
```typescript
User[]
```

---

### GET `/users/:id`

Récupérer un utilisateur par ID.

**Auth:** Session requise
**Roles:** Tous

**Response:** `200 OK`
```typescript
User
```

**Erreurs:**
- `404` - Utilisateur non trouvé

---

### PATCH `/users/:id`

Met à jour le profil d'un utilisateur (`name`, `email`, `image`, `emailVerified`).

**Auth:** Session requise
**Roles:** Tous (⚠️ **BUG CONNU**: aucune vérification de rôle ni de propriété — un utilisateur `user` peut modifier le profil de n'importe quel autre utilisateur par ID. Ne pas exposer cet endpoint côté frontend sans restreindre à `self OR master` en attendant un correctif backend.)

**Response:** `200 OK`
```typescript
User
```

**Erreurs:**
- `404` - Utilisateur non trouvé
- `409` - Email déjà utilisé par un autre utilisateur

---

### PATCH `/users/:id/role`

Change le rôle d'un utilisateur.

**Auth:** Session requise
**Roles:** `master` uniquement

**Response:** `200 OK`
```typescript
User
```

**Erreurs:**
- `403` - Permissions insuffisantes
- `404` - Utilisateur non trouvé

---

### DELETE `/users/:id`

Supprime un utilisateur.

**Auth:** Session requise
**Roles:** `master` uniquement

**Response:** `204 No Content`

---

## Gestion des erreurs

### Format standard

```typescript
interface ErrorResponse {
  statusCode: number
  message: string | string[]
  error?: string
}
```

### Codes HTTP courants

| Code | Signification | Exemple |
|------|---------------|---------|
| `400` | Bad Request | Données invalides, validation échouée |
| `401` | Unauthorized | Session expirée ou absente |
| `403` | Forbidden | Permissions insuffisantes |
| `404` | Not Found | Ressource introuvable |
| `409` | Conflict | Email déjà existant (sign-up) |
| `500` | Internal Server Error | Erreur serveur |

### Exemples de réponses d'erreur

**Validation échouée (400):**
```json
{
  "statusCode": 400,
  "message": "commonData validation failed: temperature: Number must be greater than or equal to -50",
  "error": "Bad Request"
}
```

**Non authentifié (401):**
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Not authenticated"
}
```

**Permissions insuffisantes (403):**
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

---

## Exemples complets

### Workflow complet : Créer un test de température

#### 1. Récupérer la catégorie

```typescript
// GET /categories/cat-temp-123
const category = await fetch('/categories/cat-temp-123')
  .then(res => res.json())

// Response:
{
  id: "cat-temp-123",
  name: "Tests de Température",
  baseSchema: {
    fields: [
      {
        key: "temperature",
        label: "Température (°C)",
        type: "number",
        required: true,
        validation: { min: -50, max: 150 }
      },
      {
        key: "duration",
        label: "Durée (heures)",
        type: "number",
        required: true
      },
      {
        key: "result",
        label: "Résultat",
        type: "text",
        required: true,
        validation: { enum: ["Pass", "Fail", "Inconclusive"] }
      }
    ]
  },
  customFieldsSchema: {
    allowCustomFields: true,
    maxCustomFields: 10,
    allowedTypes: ["text", "number", "boolean"],
    fields: []
  }
}
```

#### 2. Construire le formulaire

```tsx
// Frontend React/Vue/Angular
// Générer dynamiquement les champs depuis category.baseSchema

baseSchema.fields.forEach(field => {
  // Créer un input selon field.type
  switch(field.type) {
    case 'number':
      return <NumberInput
        name={field.key}
        label={field.label}
        required={field.required}
        min={field.validation?.min}
        max={field.validation?.max}
      />

    case 'text':
      if (field.validation?.enum) {
        return <Select
          name={field.key}
          label={field.label}
          options={field.validation.enum}
        />
      }
      return <TextInput name={field.key} label={field.label} />

    // etc.
  }
})
```

#### 3. Soumettre le test

```typescript
// POST /tests
const newTest = await fetch('/tests', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',  // Envoie le cookie de session
  body: JSON.stringify({
    projectId: "proj-avionics-789",  // ID du projet (obligatoire)
    categoryId: "cat-temp-123",
    name: "Test PCB v2.1 - High Temp",
    description: "Validation à 85°C pendant 48h",
    status: "in_progress",

    // Données des champs obligatoires (baseSchema)
    commonData: {
      temperature: 85,
      duration: 48,
      result: "Inconclusive"
    },

    // Données des champs custom (respecte customFieldsSchema)
    customData: {
      humidity: 65,              // number (autorisé)
      chamber: "Chamber A1",     // text (autorisé)
      notes: "First iteration"   // text (autorisé)
    },

    // Métadonnées libres
    metadata: {
      operator: "John Doe",
      equipment: "Climate Chamber XL-200"
    }
  })
})

// Response 201 Created:
{
  id: "test-456",
  projectId: "proj-avionics-789",
  categoryId: "cat-temp-123",
  name: "Test PCB v2.1 - High Temp",
  status: "in_progress",
  commonData: { temperature: 85, duration: 48, result: "Inconclusive" },
  customData: { humidity: 65, chamber: "Chamber A1", notes: "First iteration" },
  metadata: { operator: "John Doe", equipment: "Climate Chamber XL-200" },
  createdBy: "user-123",
  createdAt: "2025-01-15T10:30:00Z",
  updatedAt: "2025-01-15T10:30:00Z"
}
```

### Exemple : Validation array et object

```typescript
// Catégorie avec types avancés
const category = {
  name: "Tests Logiciels",
  baseSchema: {
    fields: [
      {
        key: "tags",
        label: "Tags",
        type: "array",
        required: true,
        validation: {
          itemType: "text",
          minItems: 1,
          maxItems: 5
        }
      },
      {
        key: "performance",
        label: "Métriques de performance",
        type: "object",
        required: true,
        validation: {
          properties: {
            cpu: {
              key: "cpu",
              label: "CPU Usage (%)",
              type: "number",
              required: true,
              validation: { min: 0, max: 100 }
            },
            memory: {
              key: "memory",
              label: "Memory (GB)",
              type: "number",
              required: true
            }
          }
        }
      }
    ]
  }
}

// Test créé avec ces types
const test = {
  projectId: "proj-software-123",
  categoryId: "cat-software",
  name: "Load Test API v2",
  commonData: {
    tags: ["api", "performance", "load-test"],  // Array de text
    performance: {                              // Object imbriqué
      cpu: 67,
      memory: 4.2
    }
  }
}
```

### Gestion des erreurs de validation

```typescript
try {
  const test = await createTest(data)
  // Succès
} catch (error) {
  if (error.statusCode === 400) {
    // Validation échouée
    const message = error.message

    // Exemples de messages:
    // "commonData validation failed: temperature: Number must be less than or equal to 150"
    // "customData validation failed: testDate: Type 'date' not allowed. Allowed types: text, number, boolean"

    // Parser le message pour afficher l'erreur sur le bon champ
    displayError(message)
  }
}
```

---

## Notes importantes pour le frontend

### 1. Cookies et CORS

- Les cookies de session sont automatiques (httpOnly, sameSite: 'lax')
- Utilisez `credentials: 'include'` dans vos fetch
- Le backend gère CORS avec les origines de confiance

### 2. Types TypeScript

Tous les types de ce document peuvent être copiés directement dans votre codebase frontend :

```typescript
// types/api.ts
export type FieldType = 'text' | 'number' | 'boolean' | 'date' | 'email' | 'url' | 'array' | 'object'

export interface FieldValidation {
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  enum?: string[]
  minItems?: number
  maxItems?: number
  itemType?: FieldType
  properties?: Record<string, FieldDefinition>
}

export interface FieldDefinition {
  key: string
  label: string
  type: FieldType
  required: boolean
  validation?: FieldValidation
  defaultValue?: any
}

export interface BaseSchema {
  fields: FieldDefinition[]
}

export interface CustomFieldsSchema {
  allowCustomFields: boolean
  maxCustomFields?: number
  allowedTypes?: FieldType[]
  fields: FieldDefinition[]
}

export interface Category {
  id: string
  name: string
  description?: string
  baseSchema: BaseSchema
  customFieldsSchema: CustomFieldsSchema
  createdAt: Date
  updatedAt: Date
}

export interface Project {
  id: string
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

export interface Test {
  id: string
  projectId: string
  categoryId: string
  name: string
  description?: string
  status: 'draft' | 'in_progress' | 'completed' | 'failed'
  commonData: Record<string, any>
  customData: Record<string, any>
  metadata?: Record<string, any>
  createdBy: string
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

// etc.
```

### 3. Génération dynamique de formulaires

Le système de schémas permet de générer des formulaires dynamiques :

1. Récupérer la catégorie
2. Parcourir `baseSchema.fields`
3. Créer un input pour chaque champ selon son `type`
4. Appliquer les règles de `validation`
5. Permettre l'ajout de custom fields selon `customFieldsSchema`

### 4. Validation côté client

Recommandation : Utiliser une bibliothèque comme **Zod** (même lib que le backend) pour valider les données avant l'envoi.

```typescript
import { z } from 'zod'

// Construire un schema Zod dynamique depuis category.baseSchema
function buildZodSchema(baseSchema: BaseSchema) {
  const shape: any = {}

  for (const field of baseSchema.fields) {
    let schema: any

    switch (field.type) {
      case 'number':
        schema = z.number()
        if (field.validation?.min) schema = schema.min(field.validation.min)
        if (field.validation?.max) schema = schema.max(field.validation.max)
        break
      case 'text':
        schema = z.string()
        if (field.validation?.enum) schema = z.enum(field.validation.enum)
        break
      // etc.
    }

    shape[field.key] = field.required ? schema : schema.optional()
  }

  return z.object(shape)
}

// Utilisation
const schema = buildZodSchema(category.baseSchema)
const validationResult = schema.safeParse(formData.commonData)

if (!validationResult.success) {
  // Afficher les erreurs
  console.error(validationResult.error)
}
```

---

## Swagger / OpenAPI

L'API expose également une documentation Swagger interactive :

**URL**: `http://localhost:3000/docs`

Cette documentation Swagger permet de :
- Tester les endpoints directement
- Voir les schémas de données
- Comprendre les codes de retour

---

**Fin de la documentation** - Version 1.0.0