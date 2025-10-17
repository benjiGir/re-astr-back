import { faker } from '@faker-js/faker';

export interface CategoryFactoryOptions {
  name?: string;
  description?: string;
  baseSchema?: any;
  customFieldsSchema?: any;
}

/**
 * Factory to generate category data for E2E tests
 */
export class CategoryFactory {
  /**
   * Build category data with optional overrides
   */
  static build(options: CategoryFactoryOptions = {}) {
    const categoryType = faker.helpers.arrayElement([
      'Temperature',
      'Vibration',
      'Electromagnetic',
      'Pressure',
      'Humidity',
    ]);

    return {
      name: options.name ?? `${categoryType} Tests - ${faker.string.alphanumeric(6)}`,
      description:
        options.description ?? faker.lorem.sentence({ min: 8, max: 15 }),
      baseSchema: options.baseSchema ?? CategoryFactory.buildBaseSchema(),
      customFieldsSchema:
        options.customFieldsSchema ?? CategoryFactory.buildCustomFieldsSchema(),
    };
  }

  /**
   * Build multiple categories at once
   */
  static buildMany(
    count: number,
    options: CategoryFactoryOptions = {},
  ): ReturnType<typeof CategoryFactory.build>[] {
    return Array.from({ length: count }, () => CategoryFactory.build(options));
  }

  /**
   * Build a realistic base schema with fields
   */
  static buildBaseSchema() {
    return {
      fields: [
        {
          name: 'component',
          type: 'text',
          required: true,
          label: 'Component Name',
        },
        {
          name: 'temperature',
          type: 'number',
          required: true,
          label: 'Temperature (°C)',
        },
        {
          name: 'duration',
          type: 'number',
          required: true,
          label: 'Test Duration (hours)',
        },
        {
          name: 'result',
          type: 'select',
          required: true,
          label: 'Test Result',
          options: ['Pass', 'Fail', 'Inconclusive'],
        },
      ],
    };
  }

  /**
   * Build custom fields schema
   */
  static buildCustomFieldsSchema() {
    const allowCustomFields = faker.datatype.boolean();

    return {
      allowCustomFields,
      maxCustomFields: allowCustomFields
        ? faker.number.int({ min: 1, max: 10 })
        : undefined,
      allowedTypes: allowCustomFields
        ? faker.helpers.arrayElements(['text', 'number', 'boolean'], {
            min: 1,
            max: 3,
          })
        : [],
      fields: [],
    };
  }

  /**
   * Build a simple category (minimal baseSchema, no custom fields)
   */
  static buildSimple(
    options: Omit<CategoryFactoryOptions, 'baseSchema' | 'customFieldsSchema'> = {},
  ): ReturnType<typeof CategoryFactory.build> {
    return CategoryFactory.build({
      ...options,
      baseSchema: {
        fields: [
          {
            name: 'component',
            type: 'text',
            required: true,
            label: 'Component',
          },
          {
            name: 'result',
            type: 'select',
            required: true,
            label: 'Result',
            options: ['Pass', 'Fail'],
          },
        ],
      },
      customFieldsSchema: {
        allowCustomFields: false,
        fields: [],
      },
    });
  }
}