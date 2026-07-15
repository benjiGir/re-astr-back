# Migration NestJS → Effect

> Plan de réécriture complète du backend RE-ASTR de NestJS (Fastify) vers Effect.
> Statut : **Phase 4 terminée côté tests unitaires** — Test Files + MinIO (upload multipart, download streamé, presigned URL, delete fail-safe). Vérification live contre un Postgres/MinIO réels pas encore faite pour les Phases 3 et 4 (à la différence des Phases 1/2). Stratégie : tranche verticale, module par module.
>
> ⚠️ **Pivot en cours de Phase 0** : en plus d'Effect, le projet est passé sur **TypeScript 7** (natif, Go) et **Drizzle ORM v1 RC**. Drizzle v1 RC a une intégration Effect native (`drizzle-orm/effect-postgres`) mais elle exige **Effect v4 beta** (`effect@4.0.0-beta.97`) — toute la stack Effect (`effect`, `@effect/platform-node`, `@effect/sql-pg`, `@effect/opentelemetry`, `@effect/vitest`) est donc sur la ligne v4 beta, pas la v3 stable envisagée initialement. Voir §4 et §9 pour le détail et les risques.

## 0. Décisions verrouillées

| Domaine | Choix | Package(s) |
|---|---|---|
| Langage | **TypeScript 7** (natif Go, `tsc` CLI seulement — l'API programmatique arrive en 7.1) | `typescript@7.0.2` |
| HTTP | HttpApi déclaratif (dérive OpenAPI) — vit dans `effect` core en v4, namespace `unstable` | `effect` (`effect/unstable/http`, `effect/unstable/httpapi`), `@effect/platform-node` |
| DB (schéma/migrations) | Drizzle conservé | `drizzle-orm@1.0.0-rc.4`, `drizzle-kit@1.0.0-rc.4` |
| DB (exécution) | Intégration Effect **native** de Drizzle v1 (pas `@effect/sql-drizzle`, incompatible drizzle-orm v1) | `drizzle-orm/effect-postgres`, `@effect/sql-pg`, `pg` (pas `postgres`/postgres.js) |
| Validation | `effect/Schema` partout | `effect` |
| Auth | **Reconstruite** en Effect (argon2, sessions, cookies, RBAC) | `effect`, `argon2` |
| Contrat API | Préservé à l'identique + **corrige les 5 failles** | — |
| Données | **Conservées** — aucune migration destructive | — |
| Tests | `@effect/vitest` + Vitest | `@effect/vitest`, `vitest` |
| Logging | Effect Logger natif (redaction réimplémentée) | `effect` |
| Runtime | Node ≥ 22 | `@effect/platform-node` |
| Observabilité | OpenTelemetry dès le début | `@effect/opentelemetry` |
| Ordre | Socle → **Projects + auth-lecture (patron)** → Categories → Tests → TestFiles → **Auth-credentials** → Users → bascule |

### Décisions de forme (revue du plan)

- **Découpage** : on **garde** le couple Repository (`Context.Service`) + Service. Tests unitaires en fournissant un `Layer` repo mocké (proche de la culture actuelle, DI par Layer bien visible).
- **Timing auth** : le **middleware `Authorization` + service `CurrentUser` + RBAC** entrent **dès la Phase 1** (branchés sur la table `sessions` existante) — le module de référence est sécurisé d'emblée, zéro retrofit. Seuls les **flux credential** (argon2, sign-up/in/out, reset) arrivent en Phase 5.
- **Nommage** : **PascalCase** idiome Effect (`Project.ts`, `ProjectsRepo.ts`). L'interdiction de barrel `index.ts` reste.
- **Cohabitation** : **hard-cut**. On vide `src/` (⚠️ **sauf** `src/database/schema/*.ts`, seul rescapé car les données sont conservées) et on purge les deps NestJS **dès la Phase 0**. Pas de dossier `legacy/` ; la référence exécutable reste dans l'historique git. Conséquence acceptée : l'API n'est complète qu'à la fin des phases.

## 1. Le changement mental

Tout ce que NestJS cachait au runtime devient **explicite dans les types**.

```
Effect<A, E, R>
        │  │  └── R : dépendances requises (ex: PgDrizzle | LoggerService) → remplace le DI
        │  └───── E : erreurs possibles, typées (ex: NotFound | SqlError)   → remplace throw/filters
        └──────── A : valeur de succès
```

Trois règles qui guident toute la réécriture :
1. **Aucun `throw`** : les erreurs sont des valeurs (`Effect.fail(new NotFound(...))`), taggées via `Schema.TaggedError`.
2. **Aucune classe `@Injectable`** : un service = un `Context.Service` (l'interface) + un `Layer` (l'implémentation). Le graphe de dépendances est composé à la main dans `main.ts` et vérifié à la compilation.
3. **Un seul schéma par donnée** : `effect/Schema` sert à la fois de type TS, de validateur encode/decode, et de contrat HttpApi (→ OpenAPI). Plus jamais de désync doc/code.

## 2. Table de correspondance

| NestJS (actuel) | Effect (cible) |
|---|---|
| `@Module` + `providers`/`imports` | Composition de `Layer` dans `main.ts` |
| `@Injectable() class Foo` | `class Foo extends Context.Service<Foo, FooShape>()("Foo") {}` + `Layer` |
| Token DI `Symbol()` + `@Inject()` | Le `Context.Service` **est** le token |
| `interface IRepository` + `useClass` | `Context.Service` (interface) + `Layer.effect` (impl Drizzle) |
| `@Controller` + `@Get/@Post` | `HttpApiGroup.make(...)` + `HttpApiEndpoint.get/post(...)` |
| DTO + décorateurs `class-validator` | `Schema.Class` / `Schema.Struct` |
| `@ApiResponse`, `@nestjs/swagger` | Dérivé automatiquement + `HttpApiScalar` (`/docs`) |
| `ValidationPipe` global | Décodage `Schema` intégré à chaque endpoint |
| `AuthGuard` / `RolesGuard` | `HttpApiMiddleware` + `HttpApiSecurity.apiKey({ in: "cookie" })` |
| `@User()` / `@CurrentUser()` | Service `CurrentUser` fourni par le middleware auth |
| `NotFoundException` etc. | `Schema.TaggedError` mappé sur un statut HTTP |
| `PinoLogger` / `LoggerService` | `Effect.log*` + `Logger` layer custom |
| `@nestjs/config` / `ConfigService` | `effect/Config` + `Redacted` pour les secrets |
| `DatabaseService` (`onModuleInit`) | `PgClient.layer(config)` → `SqlClient` → `PgDrizzle.make()` (`drizzle-orm/effect-postgres`) |
| `MinioService` (SDK wrappé) | `Minio` `Context.Service` + `Layer` (SDK wrappé en Effect) |
| Jest + `@nestjs/testing` | `@effect/vitest` (`it.effect`, provide de Layers de test) |

## 3. Structure de fichiers cible

Structure par feature conservée (proche de l'actuelle pour limiter la charge mentale), mais chaque module expose **domain / repository / service / http** au lieu de controller/service/repo/dto.

```
src/
├── main.ts                      # composition finale des Layers + NodeRuntime.runMain
├── Api.ts                       # HttpApi.make("re-astr") assemblant tous les groupes
├── infra/
│   ├── Config.ts                # effect/Config (env typé, secrets en Redacted)
│   ├── Database.ts              # PgClient.layer + PgDrizzle.make (drizzle-orm/effect-postgres), depuis Config
│   ├── Logger.ts                # Logger custom (format + redaction secrets)
│   ├── Telemetry.ts             # @effect/opentelemetry (NodeSdk layer)
│   └── Minio.ts                 # service Minio (Context.Service + Layer)
├── domain/
│   └── schema/                  # les 8 tables Drizzle + CategoryFields.ts (types purs) — seuls rescapés de l'ancien src/
├── modules/
│   ├── projects/
│   │   ├── Project.ts           # Schema (entité + Create/Update) + TaggedError
│   │   ├── ProjectsRepo.ts      # Context.Service + Layer (PgDrizzle)
│   │   ├── ProjectsService.ts   # Context.Service + Layer (logique métier)
│   │   ├── ProjectsHttp.ts      # HttpApiGroup + HttpApiBuilder.group (handlers)
│   │   └── ProjectsRepo.test.ts # @effect/vitest
│   ├── categories/  tests/  test-files/  users/   # même patron
├── auth/
│   ├── CurrentUser.ts           # [Phase 1] Context.Service fourni par le middleware
│   ├── Authorization.ts         # [Phase 1] HttpApiMiddleware (cookie → session → CurrentUser + rôle) + RBAC
│   ├── Cookie.ts                # [Phase 1] signature/vérif du cookie de session
│   ├── Credentials.ts           # [Phase 5] argon2 hash/verify + création/suppression de session
│   └── AuthHttp.ts              # [Phase 5] endpoints sign-up/in/out/get-session/forgot/reset
└── common/
    └── validation/              # portage Schema dynamique (baseSchema/customFieldsSchema)
```

> Rappel d'une contrainte projet (`.claude/CLAUDE.md`) : **pas de barrel `index.ts`**. On importe chaque module par son chemin explicite via l'alias `@/*`.

## 4. Dépendances

**État réel installé (post-pivot TS7/Drizzle v1/Effect v4 beta)** :

```
dependencies:
  effect                 4.0.0-beta.97   # core — inclut HttpApi (effect/unstable/httpapi), Schema, Config, Layer...
  @effect/platform-node  4.0.0-beta.97   # NodeHttpServer, NodeRuntime
  @effect/sql-pg         4.0.0-beta.97   # PgClient — driver pg (node-postgres)
  @effect/opentelemetry  4.0.0-beta.97   # NodeSdk
  drizzle-orm            1.0.0-rc.4      # schema, query builder, + drizzle-orm/effect-postgres (intégration Effect native)
  pg                     ^8.22.0         # driver Postgres réel sous @effect/sql-pg (PAS `postgres`/postgres.js)
  dotenv                 ^17.4.2         # charge .env — rien ne le fait automatiquement en dehors de NestJS
  argon2, minio           inchangés

devDependencies:
  typescript              7.0.2          # natif Go — CLI tsc seulement, API programmatique en 7.1
  drizzle-kit             1.0.0-rc.4
  vitest                  ^3.2.7         # PAS 4.x — @effect/vitest exige encore vitest@^3.2.0
  @effect/vitest          4.0.0-beta.97
  @vitest/coverage-v8     ^3.2.7
  tsx                     ^4.23.1
  @types/node, @types/pg  inchangés
```

**Retirés en cours de route** (installés puis supprimés pendant le pivot) :
- `@effect/sql-drizzle` — peer `drizzle-orm: ">=0.43.1 <0.50"`, incompatible avec drizzle-orm v1. Remplacé par l'intégration native `drizzle-orm/effect-postgres`.
- `@effect/platform`, `@effect/sql` — n'ont **aucune** version 4.x publiée (même non taguée) ; leur contenu a été rapatrié dans `effect` core sous `effect/unstable/http*` et probablement `effect/unstable/sql`.
- `postgres` (postgres.js) — `@effect/sql-pg` est bâti sur `pg`, pas `postgres`. Gardé par erreur dans le plan initial (§0 v1), corrigé ici.

**Supprimé (NestJS)** : tout `@nestjs/*`, tout `@fastify/*`, `nestjs-pino`, `pino`, `pino-http`, `pino-pretty`, `class-validator`, `class-transformer`, `zod`, `reflect-metadata`, `rxjs`, `better-auth`, `@nestjs/swagger`, `@nestjs/cli`, `@nestjs/schematics`, `@nestjs/testing`, `jest`, `ts-jest`, `ts-node`, `tsconfig-paths`, `source-map-support`, `supertest`, ESLint (Biome seul suffit).

**Scripts** (`package.json`, tous vérifiés fonctionnels) :
```
build      tsc -p tsconfig.build.json
start:dev  tsx watch src/main.ts
start:prod node dist/main.js
test       vitest run
test:watch vitest
test:cov   vitest run --coverage
db:*       drizzle-kit generate|migrate|push|studio   (inchangé)
db:seed    tsx src/Seed.ts
```

> ⚠️ Nuance data importante : `drizzle-orm/effect-postgres` exécute les requêtes runtime **via `@effect/sql-pg`'s `PgClient`**, mais **drizzle-kit migre la base directement, sans changement**. Donc « conserver les données » = les migrations et le schéma existants sont intacts ; seule l'exécution des requêtes applicatives passe désormais par Effect.
>
> ⚠️ **`PgDrizzle.makeWithDefaults()` ne prend PAS de `{ schema }`** — ce champ est explicitement omis du type (`EffectDrizzlePgConfig = Omit<DrizzlePgConfig, 'cache'|'logger'>`, et `DrizzlePgConfig` lui-même omet `schema`). Le champ `schema`/`relations` ne sert qu'à l'API relationnelle (`db.query.*`, via `defineRelations()` en v1). Le code actuel n'utilise que `.select().from(table)` avec des objets table importés directement — aucun schema à passer.

---

## 5. Phases d'exécution

Chaque phase se termine par un livrable **qui tourne** et **testé**. Projects (Phase 1) établit tous les patterns ; les phases suivantes les répliquent.

### Phase 0 — Socle (le serveur boote) — ✅ TERMINÉE

**But** : bootstrap Effect minimal, sans logique métier.
1. **Hard-cut** : vider `src/` **sauf `src/database/schema/*.ts`** (déplacé en `src/domain/schema/`, + `CategoryFields.ts` pour les types purs `BaseSchema`/`CustomFieldsSchema` qui n'avaient pas leur place dans le `common/validation` supprimé), purger les deps NestJS/Fastify/etc. de `package.json`, adapter les scripts (`tsx watch`, `vitest`), `tsconfig` (garder l'alias `@/*`).
2. `infra/Config.ts` : porter les env (`DATABASE_URL`, `COOKIE_SECRET`, `LOG_LEVEL`, sessions…) en `effect/Config`, secrets en `Config.redacted`. **Corrige au passage le fallback `'your-secret-key'`** → `Config` échoue proprement si absent. (`MINIO_*` reporté à la Phase 4, cf. §8.)
3. `infra/Database.ts` : `PgClient.layer({ url })` (config résolue via `Layer.unwrap`, pas `layerConfig` — coexiste mal avec l'option `types` custom) → `PgDrizzle.makeWithDefaults()` (`drizzle-orm/effect-postgres`, **pas** `@effect/sql-drizzle`). Un **seul** pool (élimine le doublon actuel DatabaseService/AuthService). Workaround OID temporel (dates/timestamps) requis par la doc officielle Drizzle, cf. §9.
4. `infra/Logger.ts` : `Logger` custom (format lisible en dev, JSON en prod, redaction `authorization`/`cookie`/`password`). Annotations lues via `fiber.getRef(CurrentLogAnnotations)`, pas `HashMap` (v4).
5. `infra/Telemetry.ts` : `NodeSdk` layer OTel avec exporter **console/pretty en dev** (spans visibles au terminal) ; OTLP réservé à la prod. Signature inchangée en v4.
6. `Api.ts` + `main.ts` : `HttpApi.make("re-astr")` avec un seul groupe `health` (`/health`, `/health/ready`), servi via `HttpRouter.serve` + `HttpApiBuilder.layer` (**pas** `HttpApiBuilder.api()/.serve()`, supprimés en v4), doc Scalar sur `/docs`. **Corrige** `/health/ready` pour renvoyer un vrai 503 quand `not_ready` (readiness ne couvre que la DB pour l'instant, storage reporté Phase 4).
7. `vitest.config.ts` + tests `SessionConfig` (COOKIE_SECRET manquant → échec ; présent → defaults corrects).
8. `Seed.ts` porté en script Effect réutilisant les Layers `Config`/`Database` ; `db:seed` fonctionnel, testé de bout en bout (4 users, 3 categories, 3 projects, 8 tests, jsonb + timestamps corrects).
9. `import 'dotenv/config'` ajouté en tête de `main.ts`/`Seed.ts` — **rien ne charge `.env` automatiquement** en dehors de `@nestjs/config` ; sans ça `DATABASE_URL` etc. restent `undefined`.
10. Toutes les extensions d'imports relatifs/`@/*` en `.js` explicite (requis par `moduleResolution: NodeNext`, y compris pour les alias `paths`).

**Done when** ✅ : `tsx watch src/main.ts` démarre, `GET /health` → 200, `GET /health/ready` → 200 (503 si DB down), `/docs` affiche Scalar, `pnpm test` passe, `pnpm run db:push` + `pnpm run db:seed` fonctionnent contre un Postgres réel.

### Phase 1 — Projects + auth-lecture (LE patron de référence) — ✅ TERMINÉE
**But** : une tranche verticale complète ET sécurisée qui fige tous les patterns réutilisables.
1. `Project.ts` : `Schema.Class` pour `Project`, `CreateProject`, `UpdateProject` ; `ProjectNotFound`/`ProjectNameConflict`/`ProjectHasTests` en `Schema.ErrorClass` (pas `TaggedError` — c'est `ErrorClass` qui porte l'annotation `httpApiStatus` consommée par `HttpApiEndpoint`, cf. §9).
2. `ProjectsRepo.ts` : `Context.Service` + `Layer` utilisant `Database` (`drizzle-orm/effect-postgres`). Erreur de repo typée `EffectDrizzleQueryError` (import `drizzle-orm/effect-core`, pas `effect-postgres`).
3. `ProjectsService.ts` : `Context.Service` + `Layer`, logique métier + `Effect.logInfo(...).pipe(Effect.annotateLogs(...))`. **Corrige** le delete : capte la violation FK `restrict` (classifiée `ConstraintError` par `@effect/sql-pg`, dénichée via `Cause.squash` sur `EffectDrizzleQueryError.cause`) → `409 ProjectHasTests` au lieu d'un 500. Idem `UniqueViolation` → `409 ProjectNameConflict` sur `name` dupliqué.
4. **Auth-lecture** (pattern réutilisé par tous les modules suivants) :
   - `Cookie.ts` : HMAC-SHA256 (`node:crypto`) sur `COOKIE_SECRET`, `${token}.${signature}`, comparaison `timingSafeEqual`. Nouveau schéma, pas compatible Better Auth (cf. §5/§7).
   - `CurrentUser.ts` : `Context.Service` portant `{id, email, name, role}`.
   - `Role.ts` : hiérarchie `master > archivist > contributor > user` + `requireRole(role)`, guard clause `yield*`-able qui lit `CurrentUser` lui-même et fail `HttpApiError.Forbidden`.
   - `Authorization.ts` : `HttpApiMiddleware.Service<Self, {provides: CurrentUser}>()(...)` (le `provides`/`requires` va en paramètre de TYPE, pas dans les options runtime — cf. §9) + `HttpApiSecurity.apiKey({key: "better-auth.session_token", in: "cookie"})`. Lit le cookie (déjà décodé par le framework), vérifie via `Cookie.verify`, cherche la session (non expirée) puis l'utilisateur, fournit `CurrentUser` au handler.
   - `test/SessionFixture.ts` : insère une session réelle + forge un cookie signé — utilisé pour la vérification manuelle (pas de login avant la Phase 5).
5. `ProjectsHttp.ts` : `HttpApiGroup.make("projects")`, 5 endpoints (`HttpApiEndpoint.get/post/patch/delete(name, path, {params, payload, success, error})` — plus de `.addSuccess()/.addError()` chaîné, cf. §9), `.middleware(Authorization)` après tous les `.add()`. **Corrige les failles 1 & 2** : identité via `CurrentUser`, jamais un header spoofable — vérifié en live, `x-user-role: master` sans cookie renvoie 401.
6. Tests (`@effect/vitest`) : `Cookie.spec.ts` (roundtrip + falsification + mauvais secret) + `ProjectsService.spec.ts` (repo mocké via `Layer.succeed` + `vi.fn()`, create/findOne/remove).

**Done when** ✅ : CRUD `/projects` fonctionnel et vérifié en live contre un Postgres réel avec de vrais cookies signés (via `SessionFixture`) — refus sans cookie (401), refus header spoofé (401), 403 sur rôle insuffisant, 409 sur nom dupliqué, 404 sur id manquant, **409 sur delete avec tests dépendants** (la faille d'origine, confirmée corrigée), 204 sur delete propre, `/docs` liste le groupe `projects`. `tsc`/`vitest`/`biome lint` propres.

### Phase 2 — Categories + validation dynamique — ✅ TERMINÉE
**But** : porter la partie la plus délicate — la validation Zod dynamique.
1. Module Categories sur le patron Projects (`Category.ts`, `CategoriesRepo.ts`, `CategoriesService.ts`, `CategoriesHttp.ts`). Pas de `CategoryNameConflict` : contrairement à `projects.name`, `categories.name` n'a pas de contrainte `unique` — le comportement d'origine n'en avait pas non plus. `CategoryHasTests` (409) ajouté sur le même modèle que `ProjectHasTests` : `tests.categoryId` a aussi `onDelete: 'restrict'`.
2. `common/validation/SchemaValidation.ts` : `SchemaValidationService` porté de Zod vers `effect/Schema`, en fonctions pures (pas de `Context.Service` — aucun état/dépendance à injecter une fois le cache abandonné, cf. écart ci-dessous).
   - Meta-validation des `baseSchema`/`customFieldsSchema` : gratuite une fois `CategoryFields.ts` en vrais `Schema` — le décodage HTTP du payload rejette déjà une définition mal formée. `validateBaseSchema`/`validateCustomFieldsSchema` existent quand même comme fonctions pures testables (parité) et réutilisables hors HTTP (ex. Seed).
   - **Construction dynamique** d'un `Schema` runtime depuis `FieldDefinition[]` (`schemaForType`/`fieldsToShape`, un type par fonction pour rester sous le seuil de complexité Biome).
   - `allowCustomFields`/`maxCustomFields`/`allowedTypes` + `detectValueType` pour les champs non déclarés.
   - Support `array`/`object` (récursif via `Schema.suspend`, cf. §9).
   - **Écart assumé** : pas de cache mémoïsé (`zodSchemaCache` de l'ancien service). Aucun appelant tant que Tests (Phase 3) n'existe pas ; ajouter un `Ref` dans un `Layer` si le profiling le justifie plus tard.
   - **Écart assumé** : `validateOrThrow` devient `validateOrFail` — échoue avec un nouveau `ValidationFailed` (`Schema.ErrorClass`, 409→400) au lieu de lancer.

**Done when** ✅ : CRUD `/categories` câblé dans `Api.ts`/`main.ts` sur le patron Projects. 28 tests de parité (`SchemaValidation.spec.ts`, repris de `schema-validation.service.spec.ts`) confirment un comportement identique à l'ancien Zod, y compris array/object imbriqués et détection de type. `tsc`/`vitest` (45 tests, tous modules)/`biome lint` propres.

### Phase 3 — Tests — ✅ TERMINÉE (tests unitaires ; vérification live pas encore faite)
**But** : le module le plus riche en logique métier.
1. Module Tests sur le patron (`Test.ts`, `TestsRepo.ts`, `TestsService.ts`, `TestsHttp.ts`). `PATCH /tests/:id` exige `contributor`, pas `archivist` (contrairement à Projects/Categories) — vérifié sur l'ancien contrôleur, pas supposé par analogie.
2. `TestsService.create` : lookup projet (→ 404 si absent, faille non numérotée corrigée, cf. point 3) et catégorie (→ 404 si absente), validation `commonData` vs `baseSchema` et `customData` vs `customFieldsSchema` (via Phase 2), auto-stamp `completedAt` sur `status: 'completed'`. `update` revalide categoryId/projectId/commonData/customData uniquement si fournis (parité stricte avec l'ancien service), factorisé dans `validateAgainstCategory` pour rester sous le seuil de complexité Biome.
3. **Corrige** : injecte `ProjectsService` pour valider l'existence de `projectId` → `404 Project not found` propre (au lieu du 500 FK actuel). Appliqué à `create` et `update`. `remove` n'a pas besoin de l'équivalent `TestHasTests` : `test_files.test_id` est en `onDelete: 'cascade'`, pas `restrict`.
4. Filtre `GET /tests?categoryId=` conservé via un `query` d'endpoint (cf. §9). Le filtre `projectId` reste non implémenté — cohérent avec le contrat corrigé.
5. **Écart de lignée** : les commits historiques mentionnant recherche `/tests/search`, filtres `projectId`/`status` et jointure auteur n'appartiennent pas à la lignée migrée — `git merge-base develop experimental/Effect` pointe sur `988e77b`, qui ne les contient pas (branche parallèle jamais mergée). Non portés.
6. `tests.schema.ts` : ajout de `.$type<Record<string, unknown>>()` sur `commonData`/`customData`/`metadata` (jamais nécessaire avant, ces colonnes n'étaient lues par aucun module précédent).

**Done when** ✅ (partiel) : CRUD `/tests` + validations dynamiques + câblage cross-module (`Api.ts`/`main.ts`) opérationnels, 10 nouveaux tests verts (55 au total), `tsc`/`biome lint` propres. ⚠️ Pas encore vérifié en live contre un Postgres réel (contrairement aux Phases 1/2) — à faire avant de considérer la phase pleinement close.

### Phase 4 — Test Files + MinIO — ✅ TERMINÉE (tests unitaires ; vérification live contre MinIO réel pas encore faite)
**But** : upload/download binaire dans Effect.
1. `infra/Minio.ts` : SDK `minio` (client Promise-based) enveloppé en `Context.Service` + `Layer` (`upload`/`download`/`presignedUrl`/`remove`, tous `Effect.tryPromise` → `MinioError` typée). Volontairement plus petit que l'ancien `MinioService` : `copyFile`/`listFiles`/`getFileBuffer`/`fileExists`/`getFileMetadata`/`getClient` n'avaient aucun appelant réel dans l'ancien `TestFilesService` — non portés.
2. Module `test-files` (aplati au même niveau que `tests`, cf. §3) sur le patron habituel + deux écarts délibérés vs l'ancien contrôleur :
   - **Pas de `POST /test-files` (métadonnées seules, sans upload réel)** — l'ancien endpoint laissait enregistrer un `objectKey` arbitraire sans jamais vérifier qu'un fichier existe à cet endroit dans MinIO. Le plan ne liste que 7 endpoints (pas de create nu) ; non porté.
   - **`PATCH` restreint à `testId`/`fileType`/`metadata`/`expiresAt`** — l'ancien DTO acceptait aussi `objectKey`/`bucketName`/`mimeType`/`checksum`, ce qui permettait à un `contributor` de rediriger la ligne vers n'importe quel objet MinIO (download/presigned-url servaient alors ce nouvel objet sans rapport avec le fichier réellement uploadé). Resserré au même sous-ensemble de champs que l'upload.
3. **Corrige** : `remove` supprime l'objet MinIO **avant** la ligne DB, et **propage l'échec** au lieu de l'avaler — `MinioError` est loggée puis remonte comme erreur typée (409/500 selon le cas), la ligne DB n'est *pas* supprimée si le storage échoue. L'ancien service faisait l'inverse : `console.error` puis suppression de la ligne quoi qu'il arrive, orphelinant l'objet dans MinIO sans plus aucune ligne y pointant.
4. `fPutObject(bucket, key, path, meta)` branché directement sur `Multipart.PersistedFile.path` (fichier temporaire déjà persisté sur disque par le parser multipart) — pas de bufferisation manuelle pour l'upload. Le checksum SHA-256 lit quand même le fichier en mémoire (`readFile`), comme l'ancien `file.toBuffer()`.
5. Endpoints : `upload` (multipart, `HttpApiSchema.asMultipart`, limite 50 Mo reprise de l'ancien `@fastify/multipart`), `findAll?testId=`, `findById`, `update`, `download` (réponse `HttpServerResponse.stream` + headers `Content-Disposition`/`Content-Type`/`Content-Length` manuels — la déclaration `success: HttpApiSchema.StreamUint8Array()` sert la doc OpenAPI, le handler renvoie la réponse brute directement), `presignedUrl` (`?expirySeconds=`), `remove`. Vérif d'existence de `testId` conservée au niveau service (`TestsService.findOne`).
6. `main.ts` : `TestFilesInfra` a besoin de `TestsService` (vérif `testId`) et `Minio` — `TestsInfra` migre à son tour de `mergeAll` vers `provideMerge`, la chaîne s'allonge exactement comme prévu (cf. §9).

**Done when** ✅ (partiel) : `tsc`/`biome lint` propres, 10 nouveaux tests unitaires (`TestFilesService.spec.ts`, 65 au total) couvrant upload/checksum, validation testId, et surtout le nouveau comportement `remove` (ligne DB conservée si le storage échoue). ⚠️ Pas encore vérifié en live contre le MinIO du `docker-compose.dev.yml` (conteneur `up`, mais aucun test end-to-end upload→download→presigned-url exécuté) — les mocks unitaires ne testent ni le vrai SDK MinIO ni le vrai parsing multipart.

### Phase 5 — Auth credentials (flux de connexion)
**But** : remplacer les flux Better Auth. L'auth-*lecture* (middleware, `CurrentUser`, RBAC, cookie) existe déjà depuis la Phase 1 ; ici on ajoute la partie *écriture*.
0. **Préalable bloquant** : confirmer les paramètres argon2 de Better Auth (cf. §7) pour que les hashs existants restent vérifiables.
1. `Credentials.ts` : hash/vérif **argon2** (mêmes paramètres → hashs existants dans `accounts.password` valides), création/suppression de session (table `sessions`), pose du cookie via `securitySetCookie`.
2. `AuthHttp.ts` : `sign-up`, `sign-in`, `sign-out`, `get-session`, `forgot-password`, `reset-password` (mêmes paths qu'aujourd'hui, y compris `/auth/get-session`).

**Done when** : login réel de bout en bout (sign-in pose un cookie que le middleware Phase 1 accepte), sign-out invalide la session, flux reset opérationnel.

### Phase 6 — Users
**But** : dernier module, dépend de `CurrentUser`.
1. Module Users sur le patron.
2. **Corrige la faille 3** : `PATCH /users/:id` restreint à `self OR master` (via `CurrentUser`). `PATCH /users/:id/role` et `DELETE` restent `master`.
3. Conflit email → `409` conservé.

**Done when** : gestion utilisateurs + garde self/master testée.

### Phase 7 — Bascule & nettoyage
1. Parité contrat : rejouer les exemples de `docs/API_CONTRACTS.md` contre la nouvelle API (e2e).
2. Vérifier la parité OpenAPI (`/docs`).
3. Mettre à jour `README.md`, `Dockerfile`, `docker-compose*.yml` (commande de démarrage), `docs/API_CONTRACTS.md` (retirer les mentions « BUG CONNU » corrigées), `.claude/AUTH.md` (marquer les failles résolues). (Le code NestJS a déjà été retiré en Phase 0 — hard-cut.)
4. Note de cutover : **les sessions actives sont invalidées** (nouveau schéma de signature de cookie) → reconnexion unique des utilisateurs.

---

## 6. Les 5 failles, corrigées par construction

| # | Faille actuelle | Correction dans la réécriture | Phase | Statut |
|---|---|---|---|---|
| 1 | Bypass auth `/projects` (header `x-user-role` spoofable) | Identité via service `CurrentUser` fourni par le middleware, jamais un header | 1 | ✅ vérifié en live (header spoofé → 401) |
| 2 | `@User()` toujours `undefined` (→ TypeError) | `CurrentUser` garanti par le type du handler | 1 | ✅ (`CurrentUser` typé, plus de `@User()`) |
| 3 | `PATCH /users/:id` sans garde | Garde `self OR master` via `CurrentUser` | 6 | ⏳ pas encore fait |
| 4 | Secret cookie codé en dur | `Config.redacted` échoue si `COOKIE_SECRET` absent | 0 | ✅ testé (`Config.spec.ts`) |
| 5 | Delete FK `restrict` → 500 | Capture de l'erreur SQL → `409` typé | 1 | ✅ vérifié en live (409 `ProjectHasTests`) |

## 7. Points de vigilance

- **Validation dynamique (Phase 2)** : c'est le portage le plus risqué. Construire un `Schema` Effect à partir de `FieldDefinition[]` au runtime demande `Schema.Struct` construit dynamiquement + `Schema.decodeUnknown`. Prévoir des tests de parité stricte Zod↔Schema avant de supprimer Zod.
- **Multipart (Phase 4)** : `@effect/platform` gère le multipart nativement (plus besoin de `@fastify/multipart`) mais l'API diffère ; valider le streaming et la limite 50 MB.
- **Compat argon2 (Phase 5)** : confirmer les paramètres argon2 utilisés aujourd'hui par Better Auth pour que les hashs existants restent vérifiables. À vérifier en tout premier de la Phase 5.
- **Cookie & sessions (Phase 1)** : l'auth-lecture arrive tôt alors qu'aucun login n'existe avant la Phase 5 → prévoir le helper de test qui forge un cookie signé. La signature de cookie est maison : les anciens cookies Better Auth ne valideront plus → sessions actives invalidées au cutover (reconnexion unique, cf. Phase 7).
- **`PgRemoteDatabase`** : quelques features Drizzle avancées peuvent différer sous le driver Effect ; le code actuel n'utilise que `select/insert/update/delete` + `eq()`, donc risque faible.
- **Un seul pool** : on unifie les 2 pools Postgres actuels ; vérifier `max`/`idle_timeout`/`connect_timeout` dans la config `PgClient`.

## 8. Décisions annexes (tranchées)

- **Build de prod** : `tsc` simple → `node dist/main.js` (pas de bundler pour l'instant).
- **Exporter OTel** : console/pretty en dev (spans au terminal) ; OTLP vers collector réservé à la prod.
- **Structure test-files** : aplati en `modules/test-files/` (même niveau que `tests`) → supprime le couplage circulaire `tests ↔ test-files` actuel (plus de `forwardRef`, dépendance à sens unique `TestFilesService → TestsService`).
- **Seed** : `seed.ts` porté en script Effect réutilisant les Layers `Config`/`Database` ; `db:seed` reste fonctionnel.

## 9. Cheat-sheet Effect v3 → v4 beta (découvert en Phase 0)

Aucune doc/context7 fiable pour v4 beta au moment de la Phase 0 (trop récent). Ce qui suit vient de la lecture directe des `.ts` sources dans `node_modules` (le package ship les sources, pas seulement les `.d.ts` — `node_modules/effect/src/*.ts`). **À revalider à chaque phase future** si la beta bouge (elle est passée de beta.83 à beta.97 pendant la seule Phase 0).

| v3 (`@effect/platform`, `effect@3.x`) | v4 beta (`effect@4.0.0-beta.97`) | Remarque |
|---|---|---|
| `import { HttpApi, HttpApiBuilder, ... } from '@effect/platform'` | `import { ... } from 'effect/unstable/httpapi'` et `'effect/unstable/http'` | `@effect/platform`/`@effect/sql` n'ont **aucune** version 4.x — absorbés dans `effect` core, sous namespace `unstable` (marqué instable par l'équipe elle-même) |
| `HttpApiEndpoint.get(name, path).addSuccess(S).addError(E)` (chaîné) | `HttpApiEndpoint.get(name, path, { success: S, error: E })` (options-object) | Toute la famille get/post/put/patch/delete change de forme |
| `HttpApiBuilder.api(Api)` + `HttpApiBuilder.serve()` | `HttpApiBuilder.layer(Api)` + `HttpRouter.serve(appLayer)` | Le pattern "router" (déjà présent en v3 sous `HttpLayerRouter`) devient LE seul chemin. `HttpRouter.serve` active le logging middleware par défaut (`disableLogger` pour l'éteindre) |
| `HttpApiScalar.layer({ path })` (lit `Api` via le contexte) | `HttpApiScalar.layer(Api, { path })` (`Api` en paramètre explicite) | Plus besoin de fournir `HttpApiBuilder.api(Api)` en amont pour que Scalar trouve l'API |
| `class Foo extends Context.Tag("Foo")<Foo, Shape>()` | `class Foo extends Context.Service<Foo, Shape>()("Foo") {}` | **Ordre des arguments inversé** : generics d'abord, clé string en dernier (double appel) |
| `Schema.Literal('a', 'b', 'c')` (variadique = union) | `Schema.Literals(['a', 'b', 'c'])` (tableau, pluriel) | `Schema.Literal(x)` reste valide pour **une seule** valeur |
| `Config.literal('a','b')('KEY')` (curried) | `Config.literals(['a','b'], 'KEY')` (appel direct, nom en 2e arg optionnel) | Idem `Config.literal(x, name?)` au singulier |
| `Config.integer('KEY')` | `Config.int('KEY')` | Simple renommage |
| `ConfigProvider.fromMap(new Map([...]))` | `ConfigProvider.fromUnknown({ ... })` | Prend un objet JS, pas une `Map` |
| `Effect.withConfigProvider(provider)(effect)` | `effect.pipe(Effect.provide(ConfigProvider.layer(provider)))` | `ConfigProvider.layer` **remplace** le provider ambiant ; `ConfigProvider.layerAdd` le complète sans remplacer |
| `Layer.unwrapEffect(effect)` | `Layer.unwrap(effect)` | Simple renommage |
| `Logger.replace(Logger.defaultLogger, myLogger)` | `Logger.layer([myLogger])` (remplace par défaut ; `{mergeWithExisting: true}` pour cumuler) | — |
| `Options<Message>` du Logger : `{message, logLevel, cause, context, spans, annotations, date, fiberId}` | `{message, logLevel, cause, fiber, date}` | Annotations/spans plus dans `Options` — passer par `fiber.getRef(CurrentLogAnnotations)` (`effect/References`, `Record<string,unknown>` **brut**, pas `HashMap`) |
| `LogLevel` = classe/namespace (`LogLevel.Info`, `.label`) | `LogLevel` = union de strings littéraux (`"Info"`, `"Debug"`, `"Warn"`...) | Utiliser directement la string ; `logLevel` dans `Logger.Options` **est** la string, pas un objet avec `.label`. Niveau `Warn` (pas `Warning`) |
| `Cause.isEmpty(cause)` | pas d'équivalent direct | Recomposer via `!Cause.hasFails(c) && !Cause.hasDies(c) && !Cause.hasInterrupts(c)` |
| `Effect.Effect.Success<typeof x>` | `Effect.Success<typeof x>` | Le type utilitaire perd le préfixe dupliqué |
| `Effect.catchAll(f)` | pas d'équivalent direct exporté | `Effect.catchCause(f)` (catch tout, y compris défauts/interruptions) est le remplaçant le plus proche pour "je veux juste un fallback quoi qu'il arrive" |
| `PgDrizzle` (tag) importé de `@effect/sql-drizzle/Pg` | `PgDrizzle.make(config)` / `.makeWithDefaults()` importés de `drizzle-orm/effect-postgres` (namespace, pas une classe-tag) | Il faut définir **son propre** `Context.Service` autour (`Database` dans le code) — `drizzle-orm/effect-postgres` ne fournit pas de tag prêt à l'emploi comme le faisait `@effect/sql-drizzle` |
| `Option.fromNullable(x)` | `Option.fromNullishOr(x)` | Traite toujours `null`/`undefined` comme `None`. Il existe aussi `fromNullishOr`-adjacent pour ne traiter QUE `undefined` comme absent |
| `Effect.zipRight(a, b)` / `a.pipe(Effect.zipRight(b))` | `Effect.andThen(...)` | `zipRight` a disparu ; `andThen` couvre le même besoin (exécute `a`, jette son résultat, exécute `b`, retourne le résultat de `b`) |
| `HttpApiMiddleware.Service<Self>()("id", {provides, security, error})` | `HttpApiMiddleware.Service<Self, {provides, requires}>()("id", {security, error})` | `provides`/`requires` sont des **paramètres de type** (2ᵉ generic), pas des champs de l'objet `options` runtime — celui-ci n'accepte que `error`/`security`/`requiredForClient` |
| Middleware par sécurité : implémentation libre | `{[securityKey]: (httpEffect, {credential, endpoint, group}) => Effect<...>}` | Le framework décode déjà `credential` (via le schema de sécurité déclaré) et l'injecte — pas besoin d'appeler `HttpApiBuilder.securityDecode` soi-même dans l'implémentation du middleware |
| Dépendances lues dans le handler par-requête | Requirement channel du handler **restreint** (`Requires | HttpRouter.Provided` uniquement) | Toute dépendance annexe (ex: `SessionConfig` dans un helper appelé par le middleware) doit être résolue **une fois** à la construction du `Layer.effect(Middleware, ...)`, puis fournie localement via `.pipe(Effect.provideService(X, resolvedX))` dans le handler — pas re-`yield*`ée à chaque requête |
| `HttpApiEndpoint.get/post/patch/put/head/options` | idem | `DELETE` s'exporte comme `del as delete` en interne — le nom public est bien `HttpApiEndpoint.delete` (accès en propriété, `delete` seul comme identifiant est un mot réservé) |
| `db.insert(...)`/`.update(...)`/`.delete(...)` échouent avec `SqlError` (comme `@effect/sql-pg` seul) | Drizzle enveloppe dans **`EffectDrizzleQueryError`** (`cause: Cause<unknown>` = `Cause.fail(sqlError)` au runtime malgré un type `Schema.Unknown`) | Import depuis `drizzle-orm/effect-core`, **pas** `drizzle-orm/effect-postgres` (qui ne le ré-exporte pas). Pour retrouver le `SqlError.reason._tag` (`UniqueViolation`, `ConstraintError`...) : `Cause.squash(error.cause as Cause.Cause<unknown>)` puis lire `.reason?._tag` en duck-typing |
| `Context.Service`-produced class : accès au type de forme | `typeof MonService.Service` | La classe générée par `Context.Service<Self, Shape>()(id)` expose `Service` comme accesseur statique du type `Shape` — pratique pour typer un mock dans les tests sans dupliquer l'interface |

**Autres points rencontrés** :
- `tsconfig.json` sous TS7 : `baseUrl` **supprimé** (paths deviennent relatifs à la racine du projet directement, donc `"@/*": ["./src/*"]` avec le `./` obligatoire — sinon `TS5090`), `moduleResolution: "node"/"node10"/"classic"` supprimés (`nodenext`/`bundler` seuls survivants — on garde `nodenext`), défauts implicites changés (`rootDir` → `.` sauf précisé, `types` → `[]` sauf précisé → il faut `"types": ["node"]` explicite sinon `process`/`console`/`Buffer` globaux disparaissent).
- `moduleResolution: NodeNext` exige l'extension `.js` explicite sur **tous** les imports relatifs et alias `@/*` (même si la source est `.ts`) — vaut aussi bien pour `tsx` (dev) que pour le `tsc` compilé (prod), donc pas de compromis possible avec `moduleResolution: bundler` sans casser `node dist/main.js`.
- `drizzle-orm/effect-postgres`'s `PgDrizzle.makeWithDefaults({schema})` **rejette** `schema` au typage (cf. §4) — ne pas perdre de temps à vouloir le faire passer, ce n'est pas prévu pour ça tant qu'on n'utilise pas `defineRelations()`.
- `@effect/sql-pg`'s `PgClient.layer({url, types})` demande le workaround `getTypeParser` documenté officiellement (orm.drizzle.team/docs/connect-effect-postgres) pour que les colonnes date/timestamp soient parsées par les codecs Drizzle plutôt que deux fois (une fois par `pg`, une fois par Drizzle) — liste d'OIDs Postgres à copier telle quelle, pas à improviser.
- `.env` n'est **jamais** chargé automatiquement en dehors de NestJS → `import 'dotenv/config'` requis en tête de tout point d'entrée (`main.ts`, `Seed.ts`, et futurs scripts CLI).
- `LOG_LEVEL` doit être capitalisé exactement (`Debug`, pas `debug`) — `Config.logLevel` valide contre l'union stricte `LogLevel`, sensible à la casse.
- **Piège de laziness (indépendant de v4, pur Effect)** : `Effect.andThen(someEffect)` où `someEffect` est déjà une VALEUR construite (`repo.delete(id)`) appelle `repo.delete(id)` **immédiatement**, au moment où la chaîne `.pipe(...)` est construite — pas seulement quand `andThen` décide effectivement d'exécuter ce second effect. Repéré via un test qui vérifiait `expect(deleteFn).not.toHaveBeenCalled()` après un échec du premier effect : le mock AVAIT été appelé (pour construire la valeur Effect), même si l'Effect résultant n'avait jamais tourné. Fix : `Effect.andThen(() => repo.delete(id))` (thunk, appelé paresseusement par `andThen` uniquement si le premier effect réussit). Règle : préférer systématiquement la forme thunk dès qu'un des deux côtés vient d'un service/mock injecté.
- **Contraintes de `Schema` (Phase 2)** : le style v3 `schema.pipe(Schema.minLength(1))` n'existe plus. En v4, chaque contrainte est un `Filter` nommé `isXxx` (`Schema.isMinLength`, `Schema.isPattern`, `Schema.isGreaterThanOrEqualTo`, `Schema.isGreaterThan`...) posé via `schema.check(Schema.isXxx(...))`, `check` acceptant plusieurs filtres en rest-params. Rien de tout ça n'est documenté (v4 beta) — trouvé en `grep`ant directement `node_modules/effect/src/Schema.ts` (15 500 lignes, sources `.ts` shippées, pas que les `.d.ts`) plutôt qu'en devinant depuis la v3.
- **Décoder dynamiquement vers un format `{field, message}[]` (Phase 2)** : `Schema.toStandardSchemaV1(schema)['~standard'].validate(data)` renvoie `{value}` ou `{issues: [{path, message}]}` (implémente standardschema.dev) — le moyen le plus direct de retrouver le format d'erreurs par champ qu'avait Zod, sans reconstruire soi-même un formateur depuis `SchemaIssue`.
- **`Schema.Schema<T>` ne suffit pas pour un schéma composé dynamiquement (Phase 2)** : dans ce design v4, `Schema<T>` n'a qu'UN seul paramètre de type (`T`, le type décodé) — `DecodingServices` (le canal `R`) vient de l'interface `Top` sous-jacente et vaut `unknown` par défaut, jamais `never`. Une fonction qui construit un `Schema` au runtime (ex. depuis un `FieldDefinition[]`) et déclare son retour `Schema.Schema<unknown>` échoue donc contre toute API exigeant `DecodingServices = never` (ex. `toStandardSchemaV1`, `ConstraintDecoder`). Fix : typer le retour en `Schema.Top` (la vue structurelle complète, supporte `.check()`/`.annotate()`/`Struct(...)`) et caster explicitement en `Schema.ConstraintDecoder<unknown>` (via un double cast `as unknown as ...`, TS refusant le cast direct) au point d'appel final — sûr ici puisqu'aucun de nos types de champ n'introduit de vraie dépendance Effect.
- **`HttpApiEndpoint` : filtre de query string (Phase 3)** : pas de méthode chaînée dédiée — une clé `query` symétrique à `params` dans les options (`{ query: { categoryId: Schema.optional(Schema.String) } }`), reçue par le handler dans le même objet déstructuré (`{ params, query, payload }`).
- **Dépendance cross-module dans `main.ts` (Phase 3, première fois que ça arrive)** : `TestsServiceLive` a besoin de `ProjectsService` et `CategoriesService` (vérif d'existence de `projectId`/`categoryId`). Les mettre simplement à côté de `TestsInfra` dans le même `Layer.mergeAll(...)` NE suffit PAS — c'est exactement l'avertissement déjà noté plus haut (mergeAll ne laisse pas les siblings se satisfaire entre eux). Il faut `Layer.provideMerge(ProjectsInfra)`/`Layer.provideMerge(CategoriesInfra)` **en plus** de `Database`/`SessionConfig`/`AppConfig`, pour que leur sortie reste visible à la fois pour `TestsInfra` et pour `ProjectsGroupLive`/`CategoriesGroupLive` (qui en ont toujours besoin aussi).
- **Piège d'`Effect.orDie` mal cadré (Phase 3, trouvé par un test qui a échoué)** : `findOne(id).pipe(Effect.andThen(() => repo.remove(id)), Effect.orDie, ...)` — l'intention était de ne faire mourir que les erreurs de `repo.remove`, mais `Effect.orDie` posé après `andThen` s'applique à **toute la chaîne qui précède**, y compris l'échec attendu `TestNotFound` de `findOne`. Résultat : un test `remove` sur un id manquant plantait (defect) au lieu d'échouer proprement. Fix : cadrer `Effect.orDie` au plus près de l'effet visé — `Effect.andThen(() => repo.remove(id).pipe(Effect.orDie))` — plutôt que de l'ajouter en bout de pipe en pensant qu'il ne visera que le dernier maillon.
- **La chaîne `provideMerge` de `main.ts` continue de s'allonger (Phase 4, confirme le pattern de la Phase 3)** : `TestFilesInfra` a besoin de `TestsService` en plus de `Minio` — donc `TestsInfra` migre à son tour de `mergeAll(...)` vers `provideMerge(...)`, exactement le même raisonnement qu'en Phase 3 pour `ProjectsInfra`/`CategoriesInfra`. Chaque nouveau module qui dépend d'un module déjà migré fait grandir la liste de `provideMerge` d'un cran — attendu, pas un signe que quelque chose cloche.
- **Payload multipart (Phase 4)** : pas de `.setPayload()` chaîné — un `Schema.Struct({..., file: Multipart.SingleFileSchema})` (import `{ Multipart } from 'effect/unstable/http'`) piped à travers `HttpApiSchema.asMultipart({ maxFileSize, maxParts, ... })` (les limites sont les options elles-mêmes, pas un champ `limits` imbriqué). Chaque champ texte du formulaire arrive en `string` (jamais de JSON imbriqué automatique) ; `Multipart.SingleFileSchema` décode en un `Multipart.PersistedFile` dont le `.path` pointe vers un fichier temporaire déjà écrit sur disque — se branche directement sur `client.fPutObject(bucket, key, path, meta)` du SDK `minio`, pas de bufferisation manuelle nécessaire côté upload.
- **Réponse streamée hors du schéma de succès déclaré (Phase 4)** : un handler peut renvoyer soit la valeur décodée du `success` déclaré, soit un `HttpServerResponse` brut directement (`Effect<SuccessType | HttpServerResponse, ...>`) — utile quand la réponse a des headers dynamiques (`Content-Disposition` avec le nom de fichier réel) qu'un schéma générique ne peut pas exprimer. `HttpApiSchema.StreamUint8Array()` sert de déclaration `success` "honnête" pour la doc OpenAPI ; `HttpServerResponse.stream(stream, { headers })` construit la vraie réponse. Le stream lui-même vient de `NodeStream.fromReadable({ evaluate: () => readable, onError })` (`@effect/platform-node`) pour transformer le `Readable` Node renvoyé par `minioClient.getObject(...)` en `Stream.Stream<Uint8Array, E>`.
- **`Config.all(record)` pour résoudre plusieurs `Config` d'un coup** : `AppConfig`/`SessionConfig`/`Database` résolvent chaque valeur avec son propre `yield*` séparé ; `Config.all({a, b, c})` (accepte aussi bien un itérable qu'un `Record<string, Config<any>>`) est l'alternative pour tout résoudre en un seul `yield*` quand il n'y a pas besoin de séquencer — utilisé dans `infra/Minio.ts` pour `MinioConfig`.

### ⚠️ Point ouvert : connexion DB eager au boot

`DatabaseLive` (via `PgClient.layer`) ouvre la connexion Postgres **dès la construction du Layer**, pas à la demande. Conséquence observée en Phase 0 : si Postgres est injoignable, **tout le serveur échoue à démarrer** — `/health` (liveness, censé rester debout même si la DB est down) n'est alors même pas joignable. Ça contredit l'intention même de séparer `/health` et `/health/ready` (le premier = "le process tourne", le second = "prêt à servir du trafic").
Pas corrigé en Phase 0 (hors scope), mais à trancher avant que ça devienne un vrai problème de prod : soit rendre la connexion DB paresseuse/best-effort au boot (le serveur démarre, `/health` répond, `/health/ready` échoue proprement jusqu'à ce que la DB revienne), soit assumer le fail-fast et le documenter comme un choix (ops doit s'assurer que Postgres est up avant l'app, pas l'inverse).
