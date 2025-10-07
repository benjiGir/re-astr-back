import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(better-auth|@noble)/)',
  ],
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '\\.spec\\.ts$',
    '\\.mock\\.ts$',
    '/test/',
    '/dto/',
    '/interfaces/',
    '/constants/',
    '/decorators/',
    '/guards/',
    '\\.controller\\.ts$',
    '/repositories/',
    '\\.module\\.ts$',
    'main\\.ts$',
    '/database/schema/',
    '/database/migrations/',
    '/config/',
    '/utils/swagger/',
  ],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@modules/(.*)$': '<rootDir>/modules/$1',
    '^@database/(.*)$': '<rootDir>/database/$1',
    '^@common/(.*)$': '<rootDir>/common/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
  },
};

export default config;