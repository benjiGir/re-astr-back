# Migration NestJS → Effect

> Plan de réécriture complète du backend RE-ASTR de NestJS (Fastify) vers Effect.
> Statut : **Phase 0 terminée et vérifiée** (boot + `/health` + `/health/ready` + `/docs` + seed + tests, tous testés contre un Postgres réel). Stratégie : tranche verticale, module par module.
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

### Phase 1 — Projects + auth-lecture (LE patron de référence)
**But** : une tranche verticale complète ET sécurisée qui fige tous les patterns réutilisables.
1. `Project.ts` : `Schema.Class` pour `Project`, `CreateProject`, `UpdateProject` ; `ProjectNotFound`/`ProjectNameConflict` en `Schema.TaggedError`.
2. `ProjectsRepo.ts` : `Context.Service` + `Layer` utilisant `PgDrizzle` (les 5 méthodes CRUD, requêtes `eq()` inchangées, mais renvoyant des `Effect`).
3. `ProjectsService.ts` : `Context.Service` + `Layer`, logique métier + logs. **Corrige** le delete : capter la violation FK `restrict` → renvoyer un `409` propre au lieu d'un 500.
4. **Auth-lecture** (pattern réutilisé par tous les modules suivants) :
   - `Cookie.ts` : signer/vérifier le cookie de session (`COOKIE_SECRET`).
   - `CurrentUser.ts` : `Context.Service` portant l'identité + le rôle.
   - `Authorization.ts` : `HttpApiMiddleware` + `HttpApiSecurity.apiKey({ key: "better-auth.session_token", in: "cookie" })` → lit le cookie, vérifie la session dans la table `sessions`, charge l'utilisateur, **fournit `CurrentUser`**. Middleware RBAC honorant `master > archivist > contributor > user`.
   - Helper de test qui insère une session + forge un cookie signé (pour tester les endpoints protégés avant que le login existe en Phase 5).
5. `ProjectsHttp.ts` : `HttpApiGroup.make("projects")` avec les 5 endpoints (mêmes paths + mêmes rôles requis qu'aujourd'hui), `.middleware(Authorization)`, `HttpApiBuilder.group` pour câbler les handlers. **Corrige les failles 1 & 2** dès ici : identité via `CurrentUser` (jamais un header spoofable).
6. Tests (`@effect/vitest`) : `ProjectsRepo.test.ts` + `ProjectsService.test.ts` (Layers de test, repo mocké) + un test d'accès refusé/accepté selon le cookie.

**Done when** : CRUD `/projects` fonctionnel, **protégé par cookie de session**, tests verts, endpoints dans `/docs`. **On relit ensemble ce module : il sert de gabarit.**

### Phase 2 — Categories + validation dynamique
**But** : porter la partie la plus délicate — la validation Zod dynamique.
1. Module Categories sur le patron Projects.
2. `common/validation` : porter `SchemaValidationService` de Zod vers `effect/Schema`.
   - Meta-validation des `baseSchema`/`customFieldsSchema` (la *forme* des définitions de champs).
   - **Construction dynamique** d'un `Schema` runtime depuis `FieldDefinition[]` (l'équivalent de `buildZodSchemaFromFields`) + cache mémoïsé.
   - `allowCustomFields`/`maxCustomFields`/`allowedTypes` + détection de type des champs non déclarés.
   - Support `array`/`object` (déjà présent côté Zod, à conserver).

**Done when** : CRUD `/categories`, et la validation d'une définition de schéma se comporte comme l'actuelle (tests de parité).

### Phase 3 — Tests
**But** : le module le plus riche en logique métier.
1. Module Tests sur le patron.
2. `TestsService.create` : lookup catégorie (→ 404 si absente), validation `commonData` vs `baseSchema` et `customData` vs `customFieldsSchema` (via Phase 2), auto-stamp `completedAt` sur `status: 'completed'`.
3. **Corrige** : injecter `ProjectsService` pour valider l'existence de `projectId` → `404 Project not found` propre (au lieu du 500 FK actuel).
4. Filtre `GET /tests?categoryId=` conservé. (Le filtre `projectId` reste non implémenté — cohérent avec le contrat corrigé ; à ajouter plus tard si besoin.)

**Done when** : CRUD `/tests` + validations dynamiques opérationnelles, tests verts.

### Phase 4 — Test Files + MinIO
**But** : upload/download binaire dans Effect.
1. `infra/Minio.ts` : wrapper le SDK `minio` en service Effect (upload, download stream, presigned URL, delete, stat). **Corrige** : delete MinIO échoué → erreur typée loggée via le vrai Logger (pas `console.error`), et on ne supprime la ligne DB que si le storage a réussi (ou stratégie explicite de nettoyage).
2. Module Test Files : multipart via `HttpApiEndpoint` (`setPayload` multipart), checksum SHA-256, `objectKey` partitionné par date, bucket `test-archives`.
3. Endpoints : upload, list `?testId=`, get, download (stream), presigned-url, patch, delete. Vérif d'existence du `testId` conservée au niveau service.

**Done when** : upload → download → presigned URL fonctionnent contre MinIO local.

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

| # | Faille actuelle | Correction dans la réécriture | Phase |
|---|---|---|---|
| 1 | Bypass auth `/projects` (header `x-user-role` spoofable) | Identité via service `CurrentUser` fourni par le middleware, jamais un header | 1 |
| 2 | `@User()` toujours `undefined` (→ TypeError) | `CurrentUser` garanti par le type du handler | 1 |
| 3 | `PATCH /users/:id` sans garde | Garde `self OR master` via `CurrentUser` | 6 |
| 4 | Secret cookie codé en dur | `Config.redacted` échoue si `COOKIE_SECRET` absent | 0 |
| 5 | Delete FK `restrict` → 500 | Capture de l'erreur SQL → `409` typé | 1, 2 |

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

**Autres points rencontrés** :
- `tsconfig.json` sous TS7 : `baseUrl` **supprimé** (paths deviennent relatifs à la racine du projet directement, donc `"@/*": ["./src/*"]` avec le `./` obligatoire — sinon `TS5090`), `moduleResolution: "node"/"node10"/"classic"` supprimés (`nodenext`/`bundler` seuls survivants — on garde `nodenext`), défauts implicites changés (`rootDir` → `.` sauf précisé, `types` → `[]` sauf précisé → il faut `"types": ["node"]` explicite sinon `process`/`console`/`Buffer` globaux disparaissent).
- `moduleResolution: NodeNext` exige l'extension `.js` explicite sur **tous** les imports relatifs et alias `@/*` (même si la source est `.ts`) — vaut aussi bien pour `tsx` (dev) que pour le `tsc` compilé (prod), donc pas de compromis possible avec `moduleResolution: bundler` sans casser `node dist/main.js`.
- `drizzle-orm/effect-postgres`'s `PgDrizzle.makeWithDefaults({schema})` **rejette** `schema` au typage (cf. §4) — ne pas perdre de temps à vouloir le faire passer, ce n'est pas prévu pour ça tant qu'on n'utilise pas `defineRelations()`.
- `@effect/sql-pg`'s `PgClient.layer({url, types})` demande le workaround `getTypeParser` documenté officiellement (orm.drizzle.team/docs/connect-effect-postgres) pour que les colonnes date/timestamp soient parsées par les codecs Drizzle plutôt que deux fois (une fois par `pg`, une fois par Drizzle) — liste d'OIDs Postgres à copier telle quelle, pas à improviser.
- `.env` n'est **jamais** chargé automatiquement en dehors de NestJS → `import 'dotenv/config'` requis en tête de tout point d'entrée (`main.ts`, `Seed.ts`, et futurs scripts CLI).
- `LOG_LEVEL` doit être capitalisé exactement (`Debug`, pas `debug`) — `Config.logLevel` valide contre l'union stricte `LogLevel`, sensible à la casse.

### ⚠️ Point ouvert : connexion DB eager au boot

`DatabaseLive` (via `PgClient.layer`) ouvre la connexion Postgres **dès la construction du Layer**, pas à la demande. Conséquence observée en Phase 0 : si Postgres est injoignable, **tout le serveur échoue à démarrer** — `/health` (liveness, censé rester debout même si la DB est down) n'est alors même pas joignable. Ça contredit l'intention même de séparer `/health` et `/health/ready` (le premier = "le process tourne", le second = "prêt à servir du trafic").
Pas corrigé en Phase 0 (hors scope), mais à trancher avant que ça devienne un vrai problème de prod : soit rendre la connexion DB paresseuse/best-effort au boot (le serveur démarre, `/health` répond, `/health/ready` échoue proprement jusqu'à ce que la DB revienne), soit assumer le fail-fast et le documenter comme un choix (ops doit s'assurer que Postgres est up avant l'app, pas l'inverse).
