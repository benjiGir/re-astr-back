# Validation des Schémas Dynamiques

Ce module fournit un système de validation pour les champs dynamiques `commonData` et `customData` des tests, basé sur les schémas définis dans les catégories.

## Architecture

```
common/validation/
├── schema.types.ts                     # Types TypeScript pour les schémas
├── schema-validation.service.ts        # Service de validation avec Zod
├── validation.module.ts                # Module global NestJS
└── test/
    └── schema-validation.service.spec.ts
```

## Utilisation

### 1. Définir un schéma de catégorie

```typescript
const category = {
  name: 'Tests de Température',
  baseSchema: {
    fields: [
      {
        key: 'temperature',
        label: 'Température (°C)',
        type: 'number',
        required: true,
        validation: { min: -50, max: 150 }
      },
      {
        key: 'duration',
        label: 'Durée (heures)',
        type: 'number',
        required: true
      }
    ]
  },
  customFieldsSchema: {
    allowCustomFields: true,
    maxCustomFields: 10,
    allowedTypes: ['text', 'number', 'boolean'],
    fields: []
  }
};
```

### 2. Créer un test avec validation

```typescript
POST /tests
{
  "categoryId": "...",
  "name": "Test Temperature 1",
  "commonData": {
    "temperature": 25,
    "duration": 2
  },
  "customData": {
    "operator": "John Doe",
    "test_number": 42
  }
}
```

### 3. Validation automatique

Le service `TestsService` valide automatiquement :
- **commonData** : Vérifie que tous les champs requis sont présents et respectent les contraintes du `baseSchema`
- **customData** : Vérifie que les champs personnalisés respectent les règles du `customFieldsSchema`

## Types de Champs Supportés

| Type | Description | Validations |
|------|-------------|-------------|
| `text` | Chaîne de caractères | minLength, maxLength, pattern, enum |
| `number` | Nombre | min, max |
| `boolean` | Booléen | - |
| `date` | Date ISO 8601 | - |
| `email` | Email valide | Format email |
| `url` | URL valide | Format URL |

## Validations

### BaseSchema (commonData)

```typescript
{
  key: 'temperature',
  type: 'number',
  required: true,
  validation: {
    min: -50,      // Valeur minimum
    max: 150       // Valeur maximum
  }
}
```

### CustomFieldsSchema (customData)

```typescript
{
  allowCustomFields: true,        // Autoriser les champs custom
  maxCustomFields: 10,             // Maximum 10 champs
  allowedTypes: ['text', 'number'], // Types autorisés
  fields: [                        // Champs prédéfinis (optionnel)
    {
      key: 'operator',
      type: 'text',
      required: false
    }
  ]
}
```

## Exemples de Validation

### ✅ Valide

```typescript
{
  "commonData": {
    "temperature": 25,
    "duration": 2
  },
  "customData": {
    "operator": "John",
    "testNumber": 42
  }
}
```

### ❌ Invalide - Champ requis manquant

```typescript
{
  "commonData": {
    "temperature": 25
    // Manque "duration" (required: true)
  }
}
// Error: duration: Required
```

### ❌ Invalide - Valeur hors limites

```typescript
{
  "commonData": {
    "temperature": 200,  // Max: 150
    "duration": 2
  }
}
// Error: temperature: Number must be less than or equal to 150
```

### ❌ Invalide - Trop de champs custom

```typescript
{
  "customData": {
    "field1": "value1",
    "field2": "value2",
    "field3": "value3"  // maxCustomFields: 2
  }
}
// Error: Maximum 2 custom fields allowed, got 3
```

### ❌ Invalide - Type non autorisé

```typescript
{
  "customData": {
    "date": "2024-01-01"  // allowedTypes: ['text', 'number']
  }
}
// Error: date: Type 'date' not allowed
```

## Intégration dans les Services

```typescript
@Injectable()
export class TestsService {
  constructor(
    private readonly schemaValidationService: SchemaValidationService,
    private readonly categoriesService: CategoriesService,
  ) {}

  async create(createTestDto: CreateTestDto) {
    const category = await this.categoriesService.findOne(
      createTestDto.categoryId
    );

    // Validation automatique
    const commonDataValidation = this.schemaValidationService.validateCommonData(
      createTestDto.commonData,
      category.baseSchema
    );
    this.schemaValidationService.validateOrThrow(
      commonDataValidation,
      'commonData'
    );

    const customDataValidation = this.schemaValidationService.validateCustomData(
      createTestDto.customData,
      category.customFieldsSchema
    );
    this.schemaValidationService.validateOrThrow(
      customDataValidation,
      'customData'
    );

    // ... create test
  }
}
```

## Tests

Lancer les tests :

```bash
pnpm test src/common/validation
```

Coverage actuelle : **100%**

## Dépendances

- **Zod 4.1.12** : Validation schema avec TypeScript
- **@nestjs/common** : Exceptions et DI

## Prochaines Améliorations

- [ ] Support des types `array` et `object`
- [ ] Validation asynchrone (ex: vérifier unicité)
- [ ] Messages d'erreur internationalisés
- [ ] Cache des schémas Zod compilés
- [ ] Validation conditionnelle (if/then/else)