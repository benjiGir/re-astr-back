# NestJS → Effect : comparaison de structure de code

> Support de présentation — source unique pour la génération du `.pptx`.
> Tous les extraits sont tirés du code réel du projet **re-astr-back**, branche `develop`
> (NestJS) et branche `experimental/Effect`. Aucun code n'a été inventé ; les extraits
> sont élagués (imports, commentaires) mais fidèles.

## Convention de lecture (pour le générateur pptx)

| Marqueur | Signification |
| --- | --- |
| `## Sxx — Titre` | 1 slide |
| `**Idée clé :**` | sous-titre / bandeau de la slide |
| `#### NestJS` / `#### Effect` | deux colonnes de code côte à côte |
| `- ` (liste) | bullets de la slide |
| `> **Notes :**` | commentaire orateur (speaker notes, non affiché) |

Les slides sans `####` sont des slides pleine largeur (texte ou tableau).

---

## S00 — Deux fois la même application

**Idée clé :** un seul domaine métier, deux architectures.

- `re-astr-back` : API de gestion de campagnes de tests (projets, catégories, tests, fichiers).
- Même base Postgres, même ORM (Drizzle), même schéma de tables, mêmes endpoints.
- Branche `develop` : NestJS 11 + Fastify.
- Branche `experimental/Effect` : Effect 4 (beta) + `HttpApi` sur `node:http`.
- Le module **`projects`** existe des deux côtés à l'identique : c'est notre fil rouge.

> **Notes :** insister sur le fait que ce n'est pas une comparaison de deux projets différents.
> C'est la même application, réécrite. Toutes les différences montrées sont donc imputables
> au framework, pas au métier.

---

## S01 — Précautions de lecture

**Idée clé :** ce qui est comparable, et ce qui ne l'est pas.

Comparable à l'identique :
- Modules métier (`projects`, `categories`, `tests`, `test-files`, `users`).
- Schéma Drizzle (tables strictement identiques).
- Endpoints HTTP et règles de rôles.

Non strictement comparable :
- **Auth** : NestJS s'appuie sur `better-auth` ; la version Effect réimplémente sessions et
  credentials à la main (`Cookie.ts`, `Credentials.ts`, `CredentialsRepo.ts`).
- **Stockage** : client `minio` côté NestJS, `@aws-sdk/client-s3` côté Effect.
- **Observabilité** : la version Effect embarque OpenTelemetry, pas la version NestJS.
- **Maturité** : Effect 4 est en beta (`4.0.0-beta.97`) ; NestJS 11 est stable.

> **Notes :** slide d'honnêteté intellectuelle. À poser tôt : si quelqu'un dans la salle
> connaît le repo, il verra ces écarts. Autant les nommer avant qu'on nous les oppose.
> Le delta de lignes sur l'auth joue *contre* Effect (code écrit à la main vs librairie).

---

## S02 — Les chiffres bruts

**Idée clé :** l'ordre de grandeur, pas une métrique de qualité.

| Mesure | NestJS | Effect |
| --- | --- | --- |
| Code source (hors tests) | 5 043 lignes | 3 924 lignes |
| Tests unitaires | 3 863 lignes | 2 676 lignes |
| Tests e2e + harness | 21 lignes (squelette) | 1 083 lignes |
| Dépendances de prod | 22 | 13 |
| Dépendances de dev | 24 | 14 |
| Fichiers pour le module `projects` | 9 | 7 |
| Fichiers *source* pour `projects` | 7 | 4 |

> **Notes :** ne pas vendre le LOC comme un argument de qualité — le dire explicitement.
> Le chiffre intéressant est le nombre de dépendances (22 → 13) : `effect` remplace
> `class-validator`, `zod`, `rxjs`, `reflect-metadata`, `@nestjs/config`, `@nestjs/swagger`,
> `pino` + `nestjs-pino` + `pino-http`. Et la ligne e2e montre surtout que le projet NestJS
> n'avait pas de vrais tests d'intégration.

---

## S03 — L'arborescence d'un module

**Idée clé :** découpage par rôle technique vs découpage par couche métier.

#### NestJS

```
src/modules/projects/
├── dto/
│   ├── create-project.dto.ts
│   └── update-project.dto.ts
├── interfaces/
│   └── projects-repository.interface.ts
├── repositories/
│   └── projects-drizzle.repository.ts
├── services/
│   └── projects.service.ts
├── test/
│   ├── projects.service.mock.ts
│   └── projects.service.spec.ts
├── projects.controller.ts
└── projects.module.ts
```

#### Effect

```
src/modules/projects/
├── Project.ts          # types + erreurs
├── ProjectsHttp.ts     # contrat + handlers
├── ProjectsService.ts  # métier
├── ProjectsRepo.ts     # accès données
├── ProjectsService.spec.ts
├── ProjectsRepo.spec.ts
└── Projects.e2e-spec.ts
```

- NestJS : un dossier par **type d'artefact** (dto, interfaces, repositories, services).
- Effect : un fichier par **responsabilité**, tests à côté de leur source.
- Le fichier `projects.module.ts` n'a pas d'équivalent : le câblage est remonté dans `App.ts`.

> **Notes :** la convention de nommage change aussi (kebab-case + suffixe de rôle →
> PascalCase). C'est une convention Effect, pas une contrainte technique.
> Point factuel à souligner : côté Effect, 4 fichiers source contiennent tout le module ;
> côté NestJS il en faut 7 dont 2 ne contiennent que du câblage ou des re-déclarations.

---

## S04 — Le contrat HTTP

**Idée clé :** décorateurs sur une classe vs valeur déclarative.

#### NestJS

```ts
@ApiTags('Projects')
@Controller('projects')
@UseGuards(RolesGuard)
@ApiCookieAuth()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles('contributor')
  @ApiOperation({ summary: 'Create a new project (contributor+)' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto)
  }
}
```

#### Effect

```ts
export const ProjectsGroup = HttpApiGroup.make('projects')
  .add(
    HttpApiEndpoint.post('create', '/projects', {
      payload: CreateProject,
      success: Project.pipe(HttpApiSchema.status(201)),
      error: [ProjectNameConflict, HttpApiError.Forbidden],
    }),
  )
  .add(HttpApiEndpoint.get('findAll', '/projects', { success: Schema.Array(Project) }))
  .add(
    HttpApiEndpoint.get('findById', '/projects/:id', {
      params: { id: Schema.String },
      success: Project,
      error: ProjectNotFound,
    }),
  )
  .middleware(Authorization)
```

- NestJS : les codes de réponse sont documentés par `@ApiResponse` — texte libre, non vérifié.
- Effect : `success` et `error` sont des schémas ; le compilateur refuse un handler qui
  renverrait autre chose.
- La documentation OpenAPI est générée depuis la même valeur, pas depuis des annotations.

> **Notes :** le point à faire passer : côté NestJS, `@ApiResponse({ status: 400 })` est un
> commentaire enrichi. Rien ne garantit qu'un 400 puisse réellement sortir, ni qu'un 409
> (qui *sort* réellement) soit documenté. Côté Effect, la liste `error` est la source de
> vérité pour la doc **et** pour le typage du handler.

---

## S05 — Le DTO et la validation

**Idée clé :** classe annotée + pipe global vs schéma qui est aussi le type.

#### NestJS

```ts
export class CreateProjectDto {
  @ApiProperty({ description: 'Project name (must be unique)' })
  @IsString()
  @IsNotEmpty()
  name!: string

  @ApiPropertyOptional({ description: 'Project description' })
  @IsString()
  @IsOptional()
  description?: string
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}
```

#### Effect

```ts
export class CreateProject extends Schema.Class<CreateProject>('CreateProject')({
  name: Schema.String,
  description: Schema.optional(Schema.String),
}) {}

export class UpdateProject extends Schema.Class<UpdateProject>('UpdateProject')({
  name: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
}) {}
```

- NestJS : le type (`name!: string`) et la règle (`@IsString()`) sont déclarés deux fois.
- Le `!` désactive la vérification d'initialisation : le compilateur croit le champ toujours présent.
- La validation dépend d'un `ValidationPipe` déclaré globalement dans `app.module.ts` —
  supprimez-le, le code compile toujours et plus rien n'est validé.
- Effect : une seule déclaration produit le type, le décodeur, l'encodeur et le schéma OpenAPI.

> **Notes :** c'est la slide la plus parlante pour un public NestJS. Le `!` sur les DTO est
> un réflexe tellement installé qu'on ne le voit plus : il dit littéralement au compilateur
> « fais-moi confiance ». La règle du projet (`.claude/CLAUDE.md`) l'interdit désormais.

---

## S06 — Le service : forme du code

**Idée clé :** classe instanciée par le conteneur vs interface + constructeur de valeur.

#### NestJS

```ts
@Injectable()
export class ProjectsService {
  constructor(
    @Inject(PROJECTS_REPOSITORY)
    private readonly projectsRepository: IProjectsRepository,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(ProjectsService.name)
  }

  async findOne(id: string) {
    const project = await this.projectsRepository.findById(id)
    if (!project) {
      this.logger.warn({ projectId: id }, 'Project not found')
      throw new NotFoundException(`Project with ID ${id} not found`)
    }
    return project
  }
}
```

#### Effect

```ts
export class ProjectsService extends Context.Service<ProjectsService, {
  readonly create: (input: CreateProject) => Effect.Effect<Project, ProjectNameConflict>
  readonly findAll: Effect.Effect<Project[]>
  readonly findOne: (id: string) => Effect.Effect<Project, ProjectNotFound>
  readonly update: (id: string, input: UpdateProject) =>
    Effect.Effect<Project, ProjectNotFound | ProjectNameConflict>
  readonly remove: (id: string) => Effect.Effect<void, ProjectNotFound | ProjectHasTests>
}>()('ProjectsService') {}

export const ProjectsServiceLive = Layer.effect(
  ProjectsService,
  Effect.gen(function* () {
    const repo = yield* ProjectsRepo
    // ... définition des fonctions
    return { create, findAll, findOne, update, remove }
  }),
)
```

- NestJS : la classe est à la fois le contrat et l'implémentation ; l'interface
  `IProjectsRepository` existe séparément pour permettre le mock.
- Effect : le **contrat** (`Context.Service`) et l'**implémentation** (`Layer.effect`) sont
  deux valeurs distinctes dans le même fichier.
- Les dépendances sont récupérées par `yield* ProjectsRepo`, pas injectées dans un constructeur.

> **Notes :** montrer que la déclaration `Context.Service` se lit comme une interface.
> C'est le contrat que le reste de l'app voit. Le `Layer` en dessous est une recette
> de construction — on peut en avoir plusieurs (prod, test, in-memory) pour le même contrat.

---

## S07 — La signature d'une méthode

**Idée clé :** le point de bascule — ce que le type dit des cas d'échec.

#### NestJS

```ts
async findOne(id: string): Promise<Project>
// Ce que le type dit  : ça rend un Project.
// Ce qui arrive       : NotFoundException, ou une erreur Postgres, ou autre chose.
```

#### Effect

```ts
findOne: (id: string) => Effect.Effect<Project, ProjectNotFound>
//                                     ^succès   ^échecs possibles, exhaustifs
```

- `Promise<T>` a un seul paramètre de type : il n'y a **pas de place** pour décrire l'échec.
- `Effect<A, E, R>` en a trois : la valeur, l'erreur, les dépendances requises.
- Conséquence directe : oublier de traiter `ProjectNotFound` est une erreur de compilation,
  pas un 500 en production.

> **Notes :** LA slide de la présentation. Prendre le temps. Poser la question à la salle :
> « qui, dans son code NestJS, sait de mémoire quelles exceptions peut lever un service
> de 200 lignes ? ». La réponse est le sujet. Enchaîner sur S10 qui en montre la conséquence
> concrète sur ce projet précis.

---

## S08 — Les erreurs métier

**Idée clé :** exceptions HTTP levées depuis le métier vs erreurs déclarées comme des données.

#### NestJS

```ts
// dans le service — le métier connaît HTTP
throw new NotFoundException(`Project with ID ${id} not found`)
```

#### Effect

```ts
export class ProjectNotFound extends Schema.TaggedErrorClass<ProjectNotFound>(
  're-astr/ProjectNotFound',
)('ProjectNotFound', { id: Schema.String }, { httpApiStatus: 404 }) {}

export class ProjectNameConflict extends Schema.TaggedErrorClass<ProjectNameConflict>(
  're-astr/ProjectNameConflict',
)('ProjectNameConflict', { name: Schema.String }, { httpApiStatus: 409 }) {}

export class ProjectHasTests extends Schema.TaggedErrorClass<ProjectHasTests>(
  're-astr/ProjectHasTests',
)('ProjectHasTests', { id: Schema.String }, { httpApiStatus: 409 }) {}
```

- NestJS : `NotFoundException` vient de `@nestjs/common`. Le service métier importe HTTP.
- Effect : l'erreur porte ses données (`id`, `name`), le code HTTP est une **annotation**
  lue par la couche HTTP.
- Le service reste testable et réutilisable hors contexte HTTP (job, CLI, worker).

> **Notes :** nuance à donner : NestJS n'*oblige* pas à lever des exceptions HTTP depuis le
> service — c'est une convention largement répandue, et c'est ce que fait ce projet.
> On peut faire propre en NestJS ; on doit alors écrire soi-même le mapping erreur → HTTP.

---

## S09 — Le repository

**Idée clé :** la couche la plus proche du niveau NestJS — mais l'absence est typée.

#### NestJS

```ts
@Injectable()
export class ProjectsDrizzleRepository implements IProjectsRepository {
  constructor(private readonly db: DatabaseService) {}

  async findById(id: string): Promise<Project | null> {
    const [project] = await this.db.drizzle
      .select().from(projects).where(eq(projects.id, id))
    return project || null
  }
}
```

#### Effect

```ts
export const ProjectsRepoLive = Layer.effect(
  ProjectsRepo,
  Effect.gen(function* () {
    const db = yield* Database

    const findById = Effect.fn('ProjectsRepo.findById')(function* (id: string) {
      return yield* Effect.map(
        db.select().from(projects).where(eq(projects.id, id)).limit(1),
        ([row]) => Option.fromNullishOr(row),
      )
    })

    return { create, findAll, findById, update, delete: deleteProject }
  }),
)
```

- Structure quasi identique : c'est la couche où les deux modèles se ressemblent le plus.
- `Promise<Project | null>` → `Effect<Option<ProjectRow>, EffectDrizzleQueryError>` :
  l'absence *et* l'erreur SQL sont dans le type.
- `Effect.fn('ProjectsRepo.findById')` nomme la fonction — voir S20 (tracing).

> **Notes :** slide rassurante à placer après S07-S08 : non, tout n'est pas bouleversé.
> L'accès données reste de l'accès données. La différence tient en un mot : `Option` au lieu
> de `| null`, ce qui force le `match` en amont au lieu du `if (!project)`.

---

## S10 — Le cas concret : créer deux projets du même nom

**Idée clé :** ce que produit chaque version face à une contrainte SQL violée.

#### NestJS

```ts
async create(createProjectDto: CreateProjectDto) {
  this.logger.info({ name: createProjectDto.name }, 'Creating new project')
  const project = await this.projectsRepository.create({ ... })
  //             ^ la violation de contrainte UNIQUE remonte ici, non capturée
  return project
}
```
→ Aucun `catch`, aucun `ExceptionFilter` dans le projet : **HTTP 500**.

#### Effect

```ts
const create = Effect.fn('ProjectsService.create')(function* (input: CreateProject) {
  return yield* repo.create(input).pipe(
    Effect.map((row) => new Project(row)),
    Effect.catchTag('EffectDrizzleQueryError', (error) =>
      sqlReasonTag(error) === 'UniqueViolation'
        ? Effect.fail(new ProjectNameConflict({ name: input.name }))
        : Effect.die(error),
    ),
  )
})
```
→ **HTTP 409**, et le test e2e l'exige.

- Même remarque pour `DELETE` sur un projet portant des tests : violation de clé étrangère,
  500 côté NestJS, `ProjectHasTests` → 409 côté Effect.
- `Effect.die` : les erreurs non prévues restent des défauts, elles ne polluent pas le type.

> **Notes :** exemple le plus convaincant parce qu'il est réel et vérifiable dans le repo.
> Ce n'est pas qu'Effect empêche le bug — c'est que le type `EffectDrizzleQueryError` dans
> la signature du repo rend son absence de traitement visible. En NestJS, `Promise<Project>`
> ne dit rien, donc personne ne se pose la question. Test e2e associé :
> `src/modules/projects/Projects.e2e-spec.ts`, « create rejects a duplicate name ».

---

## S11 — Le câblage d'un module

**Idée clé :** métadonnées interprétées au runtime vs composition de valeurs.

#### NestJS

```ts
@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    { provide: PROJECTS_REPOSITORY, useClass: ProjectsDrizzleRepository },
  ],
  exports: [ProjectsService],
})
export class ProjectsModule {}
```

#### Effect

```ts
// dans App.ts — pas de fichier dédié
const ProjectsInfra = ProjectsServiceLive.pipe(Layer.provide(ProjectsRepoLive))
```

- NestJS : un fichier + 4 listes à tenir à jour ; le token `PROJECTS_REPOSITORY` est un
  `Symbol` déclaré à côté de l'interface parce qu'une interface TypeScript n'existe pas au runtime.
- Effect : une ligne. `ProjectsRepoLive` satisfait le besoin `ProjectsRepo` de `ProjectsServiceLive`.
- Rien à exporter : les dépendances sont dans les types, pas dans une liste `exports`.

> **Notes :** le `Symbol('PROJECTS_REPOSITORY')` mérite 30 secondes : il n'existe que parce
> qu'on veut injecter *par interface*, et que les interfaces TS disparaissent à la compilation.
> Effect n'a pas ce problème — `Context.Service` est une valeur *et* un type.

---

## S12 — Le composition root

**Idée clé :** l'endroit où l'application est assemblée.

#### NestJS

```ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    LoggerModule, HealthModule, DatabaseModule, ValidationModule,
    MinioModule, AuthModule, UsersModule, CategoriesModule,
    ProjectsModule, TestsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_PIPE, useValue: new ValidationPipe({ transform: true, whitelist: true }) },
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
  ],
})
export class AppModule {}
```

#### Effect

```ts
export const AppRoutes = Layer.mergeAll(
  HttpApiBuilder.layer(Api),
  HttpApiScalar.layer(Api, { path: '/docs' }),
  CorsLive,
).pipe(
  Layer.provide(ProjectsGroupLive),
  Layer.provide(CategoriesGroupLive),
  // ...
)

export const Infra = Layer.mergeAll(
  LoggerLive, TelemetryLive, AuthorizationLive, CredentialsInfra, TestFilesInfra, UsersInfra,
).pipe(
  Layer.provideMerge(TestsInfra),
  Layer.provideMerge(ProjectsInfra),
  Layer.provideMerge(StorageLive),
  Layer.provideMerge(DatabaseLive),
  Layer.provideMerge(AppConfig.Live),
)
```

- NestJS : l'ordre des `imports` est indifférent, le conteneur résout le graphe seul.
- Effect : l'ordre est signifiant — `provideMerge` satisfait une dépendance *et* la garde
  visible pour les couches suivantes.
- `main.ts` côté Effect fait 5 lignes : `NodeRuntime.runMain(Layer.launch(MainLive))`.

> **Notes :** être franc : c'est le point où Effect demande le plus d'effort. Comprendre
> `provide` vs `provideMerge` prend un moment, et l'ordre compte. En NestJS on écrit une
> liste et ça marche. La contrepartie est la slide suivante.

---

## S13 — Quand une dépendance manque

**Idée clé :** le moment où l'erreur apparaît.

#### NestJS

```
[Nest] ERROR [ExceptionHandler] Nest can't resolve dependencies of the
ProjectsService (?, LoggerService). Please make sure that the argument
PROJECTS_REPOSITORY at index [0] is available in the ProjectsModule context.
```
→ Au **démarrage du process**. Le build passe, les types passent, le déploiement part.

#### Effect

```ts
// Layer<ProjectsService, never, ProjectsRepo>
//                               ^^^^^^^^^^^^ dépendance non satisfaite,
//                                            visible dans le type
```
→ À la **compilation**. `Layer.launch` exige un `R = never`.

- Le troisième paramètre de `Effect<A, E, R>` remonte jusqu'au composition root.
- Un service oublié ne compile pas : il n'y a pas de « ça démarrera bien en prod ».

> **Notes :** nuance obligatoire, et il faut la donner soi-même : dans `App.ts` de ce projet,
> un `as unknown as Layer<...>` contourne justement ce mécanisme. Ce n'est pas un défaut du
> modèle mais un trou d'inférence de `HttpRouter.serve` en beta.97, documenté sur place.
> Le dire nous crédibilise, et ça montre honnêtement le coût du choix « beta ».

---

## S14 — L'authentification

**Idée clé :** un garde qui écrit dans les en-têtes vs un middleware qui fournit un service.

#### NestJS

```ts
@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const sessionData = await this.authService.verifySession(sessionToken)
    const [user] = await this.db.drizzle.select().from(users)
      .where(eq(users.id, sessionData.session.userId)).limit(1)

    request.headers['x-user-id'] = sessionData.session.userId
    request.headers['x-session-id'] = sessionData.session.id
    request.headers['x-user-role'] = user.role   // ← l'identité transite par un en-tête
    return true
  }
}
```

#### Effect

```ts
export class Authorization extends HttpApiMiddleware.Service<
  Authorization,
  { provides: CurrentUser }        // ← ce que le middleware met à disposition
>()('Authorization', {
  error: HttpApiError.Unauthorized,
  security: { cookie: sessionCookieSecurity },
}) {}

// dans le handler :
return yield* httpEffect.pipe(
  Effect.provideService(CurrentUser, { ...user, session: { ... } }),
)
```

- NestJS : le garde **mute la requête**. Un handler qui lit `x-user-role` sans que le garde
  soit posé lit `undefined` — et le compilateur ne le sait pas.
- Ces en-têtes sont fournis par le client sur une requête entrante : ils ne sont fiables que
  parce que le garde les écrase.
- Effect : `provides: CurrentUser` est un contrat. Un handler qui demande `CurrentUser` sans
  middleware ne compile pas.

> **Notes :** ne pas surjouer le risque de sécurité, mais le mentionner : écrire l'identité
> dans `request.headers` fait cohabiter donnée de confiance et donnée client dans le même
> sac. Le point principal reste le typage : `CurrentUser` est une dépendance déclarée.

---

## S15 — L'autorisation

**Idée clé :** métadonnées lues par réflexion vs appel de fonction dans le handler.

#### NestJS

```ts
export const ROLES_KEY = 'roles'
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles)

// RolesGuard
const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
  context.getHandler(), context.getClass(),
])
if (!requiredRoles || requiredRoles.length === 0) return true   // ← pas de rôle = ouvert
const userRole = request.headers['x-user-role'] as UserRole
```

#### Effect

```ts
export const requireRole = Effect.fn('Role.requireRole')(function* (requiredRole: UserRole) {
  const user = yield* CurrentUser
  if (!hasRequiredRole(user.role, requiredRole)) return yield* new HttpApiError.Forbidden()
})

// dans le handler
.handle('create', ({ payload }) =>
  requireRole('contributor').pipe(Effect.andThen(() => service.create(payload))),
)
```

- NestJS : trois éléments à synchroniser — le décorateur, le garde, et `@UseGuards` sur le
  contrôleur. Il faut aussi que `Forbidden` soit documenté à la main via `@ApiResponse`.
- Effect : `requireRole` est une fonction ordinaire ; son échec `Forbidden` doit figurer
  dans la liste `error` de l'endpoint, sinon la compilation échoue.
- Le `as UserRole` sur un en-tête HTTP côté NestJS est un cast non vérifié.

> **Notes :** insister sur le lien avec S04 : côté Effect, il y a un chemin typé entre
> « ce handler peut échouer en Forbidden » et « l'OpenAPI documente un 403 ». Côté NestJS
> ce sont deux déclarations indépendantes qui peuvent diverger silencieusement.

---

## S16 — La configuration

**Idée clé :** getters castés sur une map dynamique vs valeurs typées lues au démarrage.

#### NestJS

```ts
export default registerAs('database', () => ({
  url: process.env.DATABASE_URL || 'postgresql://localhost:5432/re_astr',
  port: Number.parseInt(process.env.DB_PORT || '5432', 10),
  ssl: process.env.DB_SSL === 'true',
}))

@Injectable()
export class DatabaseConfigService {
  constructor(private readonly configService: ConfigService) {}
  get url(): string { return <string>this.configService.get('database.url') }
  get port(): number { return <number>this.configService.get('database.port') }
}
```
+ un `config.module.ts` par domaine de configuration (app, database, minio).

#### Effect

```ts
export const DatabaseConfig = {
  url: Config.redacted('DATABASE_URL'),
}

export const ServerConfig = {
  port: Config.int('PORT').pipe(Config.withDefault(3000)),
}
```

- NestJS : `configService.get('database.url')` renvoie `unknown` ; chaque getter le force
  avec `<string>`. Une faute de frappe dans la clé donne `undefined` typé `string`.
- Effect : `Config.int` échoue au démarrage si la variable n'est pas un entier.
- 9 fichiers de configuration côté NestJS (3 domaines × config + service + module),
  1 fichier de 75 lignes côté Effect.

> **Notes :** le cast `<string>` est le même problème que le `!` des DTO (S05) : une
> promesse faite au compilateur, non vérifiée. La règle projet interdit désormais les deux.

---

## S17 — Les secrets

**Idée clé :** un type dédié pour ce qui ne doit pas fuiter dans les logs.

#### NestJS

```ts
// main.ts
await app.register(fastifyCookie, {
  secret: process.env.COOKIE_SECRET || 'your-secret-key',
})
```

#### Effect

```ts
/**
 * Pas de `withDefault` sur `cookieSecret` : le démarrage doit échouer bruyamment
 * si la variable est absente, au lieu de retomber silencieusement sur une
 * constante connue.
 */
const cookieSecret = yield* Config.redacted('COOKIE_SECRET')
// Redacted<string> — s'affiche "<redacted>" dans un log ou un console.log
```

- `Config.redacted` produit un `Redacted<string>` : il faut `Redacted.value(...)` pour le lire.
- Le fallback `|| 'your-secret-key'` produit une application qui démarre avec un secret
  public — c'est un bug corrigé par la migration, pas une différence de style.

> **Notes :** exemple court et frappant. Le type `Redacted` empêche le secret de partir dans
> un log par accident : `console.log(secret)` affiche `<redacted>`. Utile aussi pour les
> messages d'erreur qui sérialisent le contexte.

---

## S18 — La connexion base de données

**Idée clé :** cycle de vie par hooks de classe vs ressource scopée.

#### NestJS

```ts
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private client!: Sql
  public drizzle!: PostgresJsDatabase<typeof schema>

  onModuleInit() {
    this.client = postgres(this.databaseConfigService.url, { max: 10, ... })
    this.drizzle = drizzle(this.client, { schema })
  }

  async onModuleDestroy() {
    if (this.client) await this.client.end()
  }
}
```

#### Effect

```ts
const dbEffect = PgDrizzle.makeWithDefaults()

export class Database extends Context.Service<Database, Effect.Success<typeof dbEffect>>()(
  'Database',
) {}

export const DatabaseLive = Layer.unwrap(
  Effect.gen(function* () {
    const url = yield* DatabaseConfig.url
    const PgClientLive = PgClient.layer({ url, types: { ... } })
    return Layer.effect(Database, dbEffect).pipe(Layer.provideMerge(PgClientLive))
  }),
)
```

- NestJS : deux `!` de plus. Entre l'instanciation et `onModuleInit`, `drizzle` est
  `undefined` alors que le type affirme le contraire.
- Effect : la fermeture du pool est portée par le `Layer` (scope), pas par un hook à écrire.
- Effet de bord de la migration : un seul pool. La version NestJS en ouvrait deux —
  celui de `DatabaseService` et celui de `AuthService`.

> **Notes :** le double pool est un détail mais il illustre bien le glissement : quand chaque
> module peut créer sa ressource dans son coin, on duplique sans s'en rendre compte.
> Avec les Layers, `DatabaseLive` est une valeur unique partagée par construction.

---

## S19 — Les logs

**Idée clé :** un service à injecter et contextualiser vs une capacité ambiante.

#### NestJS

```ts
constructor(private readonly logger: LoggerService) {
  this.logger.setContext(ProjectsService.name)   // ← à ne pas oublier
}

this.logger.info({ projectId: project.id, name: project.name }, 'Project created successfully')
```
Dépendances : `nestjs-pino`, `pino`, `pino-http` + un module (`logger.module.ts`,
`logger.service.ts`, `pino-logger.service.ts`, `noop-logger.service.ts`, `logger.interface.ts`).

#### Effect

```ts
Effect.tap((project) =>
  Effect.logInfo('Project created').pipe(
    Effect.annotateLogs({ id: project.id, name: project.name }),
  ),
)
```
Dépendances : aucune. `LoggerLive` (`src/infra/Logger.ts`) ne fait que définir le **format**.

- Aucun logger à injecter : `Effect.logInfo` est disponible partout, y compris dans une
  fonction pure du domaine.
- `Effect.annotateLogs` s'applique aussi à tout ce qui est appelé en aval (annotations héritées).
- Le formateur maison redacte `authorization`, `cookie`, `password`… sur les annotations.

> **Notes :** point à mentionner si la salle est technique : les annotations sont portées par
> le contexte d'exécution (fiber), pas par un paramètre. On peut annoter un `requestId` en
> haut de la requête et le retrouver dans tous les logs en aval sans le passer de main en main.

---

## S20 — Le tracing

**Idée clé :** une différence de nature, pas de style.

#### NestJS

```ts
async findOne(id: string) { ... }
// Pas d'instrumentation dans ce projet. L'ajouter = décorateur maison,
// interceptor, ou instrumentation manuelle par méthode.
```

#### Effect

```ts
const findOne = Effect.fn('ProjectsService.findOne')(function* (id: string) { ... })
//              ^^^^^^^^^ crée un span OpenTelemetry nommé

const findAll = repo.findAll.pipe(
  Effect.map((rows) => rows.map((row) => new Project(row))),
  Effect.withSpan('ProjectsService.findAll'),
)
```

- `Effect.fn('nom')` définit la fonction **et** son span : la trace est le graphe d'appels réel.
- Les spans s'emboîtent seuls (`ProjectsService.create` → `ProjectsRepo.create` → requête SQL).
- Export OTLP branché dans `src/infra/Telemetry.ts`, visualisé dans Jaeger.

> **Notes :** montrer une capture Jaeger si le temps le permet — c'est l'argument le plus
> visuel de la présentation. Rappeler la précaution S01 : NestJS *peut* faire de l'OTel
> (`@opentelemetry/instrumentation-nestjs-core`), ce projet ne l'a simplement jamais fait.
> La différence réelle est le coût marginal : ici, zéro ligne dédiée.

---

## S21 — Le test unitaire d'un service

**Idée clé :** monter un conteneur de test vs fournir une valeur.

#### NestJS

```ts
beforeEach(async () => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ProjectsService,
      { provide: PROJECTS_REPOSITORY, useValue: mockRepository },
      { provide: LoggerService, useValue: mockLogger },   // ← sinon : échec d'injection
    ],
  }).compile()

  service = module.get<ProjectsService>(ProjectsService)
  jest.clearAllMocks()
})

it('should create a project successfully', async () => {
  jest.spyOn(repository, 'create').mockResolvedValue(mockProject)
  const result = await service.create(createProjectDto)
  expect(result).toEqual(mockProject)
})
```

#### Effect

```ts
const runWithRepo = <A, E>(repo: typeof ProjectsRepo.Service, effect: Effect.Effect<A, E, ProjectsService>) =>
  Effect.provide(effect, ProjectsServiceLive.pipe(Layer.provide(Layer.succeed(ProjectsRepo, repo))))

it.effect('findOne fails with ProjectNotFound when the repo returns none', () =>
  runWithRepo(
    makeMockRepo({ findById: vi.fn(() => Effect.succeed(Option.none())) }),
    Effect.gen(function* () {
      const service = yield* ProjectsService
      const error = yield* Effect.flip(service.findOne('missing-id'))

      expect(error).toBeInstanceOf(ProjectNotFound)
      expect(error.id).toBe('missing-id')
    }),
  ),
)
```

- NestJS : il faut mocker le logger, sinon l'injection échoue — une dépendance sans rapport
  avec le test. `beforeEach` asynchrone et état partagé entre les tests.
- Effect : `Layer.succeed(ProjectsRepo, repo)` remplace l'implémentation. Pas de conteneur,
  pas d'état mutable entre les cas.
- `Effect.flip` inverse succès et erreur : on teste le canal d'erreur avec les mêmes outils,
  et `error.id` est typé.

> **Notes :** le mock du logger est très parlant pour un public NestJS — tout le monde a déjà
> passé dix minutes sur un « Nest can't resolve dependencies » dans un test.
> Côté Effect, `Effect.logInfo` n'étant pas une dépendance, il n'y a rien à mocker.

---

## S22 — Le test end-to-end

**Idée clé :** ce que la migration a rendu praticable.

#### NestJS

`test/app.e2e-spec.ts` — 21 lignes, le squelette généré par le CLI.
Les modules métier n'ont pas de test e2e.

#### Effect

```ts
describe('Projects', () => {
  layer(AppTestLayer)((it) => {
    it.effect('a contributor can create a project; a plain user cannot', () =>
      Effect.gen(function* () {
        const contributor = yield* createAuthenticatedUser('contributor')
        const created = yield* postJson('/projects', { name: unique('Project') }, contributor.cookieHeader)
        expect(created.status).toBe(201)

        const user = yield* createAuthenticatedUser('user')
        const forbidden = yield* postJson('/projects', { name: unique('Project') }, user.cookieHeader)
        expect(forbidden.status).toBe(403)
      }),
    )
  })
})
```

- `AppTestLayer` démarre la vraie application sur un port éphémère, avec Postgres et MinIO
  réels via testcontainers.
- Requêtes HTTP réelles, authentification réelle : c'est le même `Layer` qu'en production,
  avec la config de test fournie par-dessus.
- 1 083 lignes de tests e2e + harness, contre 21 côté NestJS.

> **Notes :** rester factuel : rien n'empêchait d'écrire ces tests en NestJS
> (`Test.createTestingModule` + supertest, c'est un chemin balisé). Le point honnête est que
> le modèle des Layers rend la substitution de dépendances suffisamment mécanique pour que
> ça se fasse. Le mérite revient autant à la discipline qu'au framework.

---

## S23 — Récapitulatif

**Idée clé :** la même préoccupation, deux emplacements.

| Préoccupation | NestJS | Effect |
| --- | --- | --- |
| Contrat HTTP | décorateurs + `@ApiResponse` (déclaratif, non vérifié) | `HttpApiEndpoint` (schémas typés) |
| Validation | `class-validator` + `ValidationPipe` global | `Schema.Class` (type = validateur) |
| Erreurs | exceptions levées, invisibles dans le type | canal `E` de `Effect<A, E, R>` |
| Injection | `@Module` + tokens `Symbol` | `Context.Service` + `Layer` |
| Dépendance manquante | erreur au démarrage | erreur de compilation |
| Identité de l'appelant | `request.headers['x-user-role']` | service `CurrentUser` |
| Rôles | `@Roles` + `Reflector` | `yield* requireRole('archivist')` |
| Config | `ConfigService.get()` + casts | `Config.*`, échec au démarrage |
| Secrets | `string` | `Redacted<string>` |
| Cycle de vie | `OnModuleInit` / `OnModuleDestroy` | scope du `Layer` |
| Logs | `LoggerService` injecté + `setContext` | `Effect.logInfo` + `annotateLogs` |
| Tracing | à ajouter | `Effect.fn('nom')` |
| Mock en test | `Test.createTestingModule` | `Layer.succeed(Tag, impl)` |

> **Notes :** slide de synthèse, à laisser affichée pendant les questions.
> Le fil conducteur si on ne devait retenir qu'une chose : en NestJS ces préoccupations sont
> déclarées *à côté* du code (métadonnées, listes, décorateurs) ; en Effect elles sont
> *dans* les types. D'où le déplacement des erreurs du runtime vers la compilation.

---

## S24 — Ce que ça coûte

**Idée clé :** les contreparties, sans lesquelles la comparaison est malhonnête.

Coûts du modèle Effect :
- **Courbe d'apprentissage** : `Effect.gen`, `pipe`, `Layer`, `Option`, `Cause` — le langage
  quotidien change, pas seulement la librairie.
- **Composition root explicite** : l'ordre des `provide` / `provideMerge` compte. NestJS
  résout le graphe seul.
- **Maturité** : Effect 4 est en beta. Ce projet contient un `as unknown as Layer<...>`
  qui contourne un trou d'inférence de `HttpRouter.serve` (`beta.97`).
- **Écosystème** : `better-auth` a dû être remplacé par une implémentation maison.
- **Recrutement et lisibilité** : `Effect.fn(...)(function* () { ... })` n'est pas
  déchiffrable en un coup d'œil pour un développeur qui découvre.

Ce que NestJS apporte en face :
- Écosystème mature, documentation abondante, conventions connues de tous.
- Un développeur NestJS est opérationnel immédiatement.
- Le conteneur DI est invisible tant que rien ne casse — et il casse au démarrage,
  pas en production.

> **Notes :** slide de conclusion. Ne pas terminer sur un vainqueur : terminer sur le
> critère de choix. Effect déplace du travail du runtime vers la compilation, et de la
> configuration vers les types ; ce qu'on paie, c'est le temps d'apprentissage et la beta.
> Sur un projet où les erreurs de production coûtent cher et l'équipe est petite et stable,
> l'échange est intéressant. Sur une équipe qui tourne beaucoup, il faut y réfléchir à deux fois.

---

## Annexe — Fichiers cités

| Sujet | NestJS (`develop`) | Effect (`experimental/Effect`) |
| --- | --- | --- |
| Contrat HTTP | `src/modules/projects/projects.controller.ts` | `src/modules/projects/ProjectsHttp.ts` |
| DTO / schémas | `src/modules/projects/dto/*.dto.ts` | `src/modules/projects/Project.ts` |
| Service | `src/modules/projects/services/projects.service.ts` | `src/modules/projects/ProjectsService.ts` |
| Repository | `src/modules/projects/repositories/projects-drizzle.repository.ts` | `src/modules/projects/ProjectsRepo.ts` |
| Câblage module | `src/modules/projects/projects.module.ts` | `src/App.ts` |
| Composition root | `src/app.module.ts` + `src/main.ts` | `src/App.ts` + `src/main.ts` |
| Auth | `src/auth/guards/auth.guard.ts` | `src/auth/Authorization.ts` |
| Rôles | `src/auth/guards/roles.guard.ts`, `src/auth/decorators/roles.decorator.ts` | `src/auth/Role.ts` |
| Config | `src/config/**/*.ts` | `src/infra/Config.ts` |
| Base de données | `src/database/database.service.ts` | `src/infra/Database.ts` |
| Logs | `src/common/logger/*.ts` | `src/infra/Logger.ts` |
| Tracing | — | `src/infra/Telemetry.ts` |
| Test unitaire | `src/modules/projects/test/projects.service.spec.ts` | `src/modules/projects/ProjectsService.spec.ts` |
| Test e2e | `test/app.e2e-spec.ts` | `src/modules/projects/Projects.e2e-spec.ts`, `src/test/AppTestLayer.ts` |
