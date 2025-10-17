import { faker } from '@faker-js/faker';

export interface TestFactoryOptions {
  categoryId?: string;
  name?: string;
  description?: string;
  status?: 'draft' | 'in_progress' | 'completed' | 'failed';
  commonData?: Record<string, any>;
  customData?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Factory to generate test data for E2E tests
 */
export class TestFactory {
  /**
   * Build test data with optional overrides
   */
  static build(options: TestFactoryOptions = {}) {
    const testType = faker.helpers.arrayElement([
      'Temperature',
      'Vibration',
      'Pressure',
      'Humidity',
      'Electromagnetic',
    ]);

    const component = faker.helpers.arrayElement([
      'PCB',
      'Connector',
      'Capacitor',
      'Resistor',
      'MCU',
      'Sensor',
    ]);

    return {
      categoryId: options.categoryId ?? faker.string.uuid(),
      name:
        options.name ??
        `${testType} Test - ${component} ${faker.string.alphanumeric(6)}`,
      description:
        options.description ??
        faker.lorem.sentence({ min: 10, max: 20 }),
      status: options.status ?? faker.helpers.arrayElement(['draft', 'in_progress', 'completed', 'failed']),
      commonData: options.commonData ?? TestFactory.buildCommonData(),
      customData: options.customData ?? TestFactory.buildCustomData(),
      metadata: options.metadata ?? TestFactory.buildMetadata(),
    };
  }

  /**
   * Build multiple tests at once
   */
  static buildMany(
    count: number,
    options: TestFactoryOptions = {},
  ): ReturnType<typeof TestFactory.build>[] {
    return Array.from({ length: count }, () => TestFactory.build(options));
  }

  /**
   * Build common data that matches typical category schemas
   */
  static buildCommonData(): Record<string, any> {
    return {
      component: `${faker.helpers.arrayElement(['PCB', 'CAP', 'RES', 'MCU'])}-${faker.string.alphanumeric(8)}`,
      temperature: faker.number.int({ min: -40, max: 125 }),
      duration: faker.number.int({ min: 1, max: 72 }),
      result: faker.helpers.arrayElement(['Pass', 'Fail', 'Inconclusive']),
    };
  }

  /**
   * Build custom data (additional fields not in schema)
   */
  static buildCustomData(): Record<string, any> {
    return {
      notes: faker.lorem.sentence(),
      humidity: faker.number.int({ min: 0, max: 100 }),
      operator: faker.person.fullName(),
    };
  }

  /**
   * Build metadata
   */
  static buildMetadata(): Record<string, any> {
    return {
      equipment: `${faker.helpers.arrayElement(['Chamber', 'Table', 'Analyzer'])}-${faker.string.alphanumeric(5)}`,
      laboratory: faker.helpers.arrayElement(['Lab A', 'Lab B', 'Lab C']),
      standard: faker.helpers.arrayElement([
        'IEC 61000-4-3',
        'ISO 16750-4',
        'MIL-STD-810',
      ]),
    };
  }

  /**
   * Build a draft test
   */
  static buildDraft(
    options: Omit<TestFactoryOptions, 'status'> = {},
  ): ReturnType<typeof TestFactory.build> {
    return TestFactory.build({ ...options, status: 'draft' });
  }

  /**
   * Build an in-progress test
   */
  static buildInProgress(
    options: Omit<TestFactoryOptions, 'status'> = {},
  ): ReturnType<typeof TestFactory.build> {
    return TestFactory.build({ ...options, status: 'in_progress' });
  }

  /**
   * Build a completed test
   */
  static buildCompleted(
    options: Omit<TestFactoryOptions, 'status'> = {},
  ): ReturnType<typeof TestFactory.build> {
    return TestFactory.build({ ...options, status: 'completed' });
  }

  /**
   * Build a failed test
   */
  static buildFailed(
    options: Omit<TestFactoryOptions, 'status'> = {},
  ): ReturnType<typeof TestFactory.build> {
    return TestFactory.build({ ...options, status: 'failed' });
  }
}