import { NodeRuntime } from '@effect/platform-node'
import 'dotenv/config'
import argon2 from 'argon2'
import { Effect } from 'effect'
import { accounts } from '@/domain/schema/accounts.schema.js'
import { categories } from '@/domain/schema/categories.schema.js'
import { projects } from '@/domain/schema/projects.schema.js'
import { tests } from '@/domain/schema/tests.schema.js'
import { users } from '@/domain/schema/users.schema.js'
import { Database, DatabaseLive } from '@/infra/Database.js'

const seed = Effect.gen(function* () {
  console.log('🌱 Starting database seed...\n')
  const db = yield* Database

  console.log('🗑️  Clearing existing data...')
  yield* db.delete(tests)
  yield* db.delete(projects)
  yield* db.delete(categories)
  yield* db.delete(accounts)
  yield* db.delete(users)
  console.log('✅ Data cleared\n')

  // ==================== USERS ====================
  console.log('👥 Creating users...')

  const password = yield* Effect.tryPromise(() => argon2.hash('Password123!'))

  const [master] = yield* db
    .insert(users)
    .values({ name: 'Alice Master', email: 'alice@re-astr.com', emailVerified: true, role: 'master' })
    .returning()
  const [archivist] = yield* db
    .insert(users)
    .values({ name: 'Bob Archivist', email: 'bob@re-astr.com', emailVerified: true, role: 'archivist' })
    .returning()
  const [contributor] = yield* db
    .insert(users)
    .values({ name: 'Charlie Contributor', email: 'charlie@re-astr.com', emailVerified: true, role: 'contributor' })
    .returning()
  const [regularUser] = yield* db
    .insert(users)
    .values({ name: 'Diana User', email: 'diana@re-astr.com', emailVerified: true, role: 'user' })
    .returning()

  console.log('✅ Created 4 users')

  console.log('🔐 Creating user accounts...')
  for (const user of [master, archivist, contributor, regularUser]) {
    yield* db.insert(accounts).values({ accountId: user.id, providerId: 'credential', userId: user.id, password })
  }
  console.log('✅ Created accounts for all users\n')

  // ==================== CATEGORIES ====================
  console.log('📁 Creating categories...')

  const [temperatureCategory] = yield* db
    .insert(categories)
    .values({
      name: 'Temperature Tests',
      description: 'Electronic component validation at various temperatures',
      baseSchema: {
        fields: [
          { key: 'component', type: 'text', required: true, label: 'Component Name' },
          { key: 'temperature', type: 'number', required: true, label: 'Temperature (°C)' },
          { key: 'duration', type: 'number', required: true, label: 'Test Duration (hours)' },
          {
            key: 'result',
            type: 'text',
            required: true,
            label: 'Test Result',
            validation: { enum: ['Pass', 'Fail', 'Inconclusive'] },
          },
        ],
      },
      customFieldsSchema: {
        allowCustomFields: true,
        maxCustomFields: 5,
        allowedTypes: ['text', 'number', 'boolean'],
        fields: [],
      },
    })
    .returning()

  const [vibrationCategory] = yield* db
    .insert(categories)
    .values({
      name: 'Vibration Tests',
      description: 'Mechanical stress testing through vibration',
      baseSchema: {
        fields: [
          { key: 'component', type: 'text', required: true, label: 'Component Name' },
          { key: 'frequency', type: 'number', required: true, label: 'Frequency (Hz)' },
          { key: 'amplitude', type: 'number', required: true, label: 'Amplitude (mm)' },
          { key: 'duration', type: 'number', required: true, label: 'Duration (minutes)' },
          {
            key: 'result',
            type: 'text',
            required: true,
            label: 'Test Result',
            validation: { enum: ['Pass', 'Fail'] },
          },
        ],
      },
      customFieldsSchema: { allowCustomFields: true, maxCustomFields: 3, allowedTypes: ['text', 'number'], fields: [] },
    })
    .returning()

  const [emsCategory] = yield* db
    .insert(categories)
    .values({
      name: 'Electromagnetic Susceptibility',
      description: 'Testing component behavior under electromagnetic interference',
      baseSchema: {
        fields: [
          { key: 'component', type: 'text', required: true, label: 'Component Name' },
          { key: 'fieldStrength', type: 'number', required: true, label: 'Field Strength (V/m)' },
          { key: 'frequency', type: 'number', required: true, label: 'Frequency (MHz)' },
          {
            key: 'result',
            type: 'text',
            required: true,
            label: 'Test Result',
            validation: { enum: ['Pass', 'Fail', 'Degraded Performance'] },
          },
        ],
      },
      customFieldsSchema: { allowCustomFields: false, fields: [] },
    })
    .returning()

  console.log('✅ Created 3 categories\n')

  // ==================== PROJECTS ====================
  console.log('📊 Creating projects...')

  const [avionicsProject] = yield* db
    .insert(projects)
    .values({
      name: 'Avionics System Validation',
      description: 'Comprehensive testing program for next-generation avionics components',
    })
    .returning()
  const [automotiveProject] = yield* db
    .insert(projects)
    .values({
      name: 'Automotive Electronics Certification',
      description: 'Testing automotive electronic components for ISO 26262 compliance',
    })
    .returning()
  const [medicalProject] = yield* db
    .insert(projects)
    .values({
      name: 'Medical Device Qualification',
      description: 'Safety and reliability testing for medical electronic devices',
    })
    .returning()

  console.log('✅ Created 3 projects\n')

  // ==================== TESTS ====================
  console.log('🧪 Creating tests...')

  yield* db.insert(tests).values([
    {
      projectId: avionicsProject.id,
      categoryId: temperatureCategory.id,
      name: 'High Temperature Stress Test - PCB v2.1',
      description: 'Testing PCB board at 85°C for 48 hours',
      status: 'completed',
      commonData: { component: 'PCB-2024-v2.1', temperature: 85, duration: 48, result: 'Pass' },
      customData: { humidity: 85, notes: 'All components within spec' },
      metadata: { equipment: 'Climate Chamber XL-200', operator: 'John Doe', laboratory: 'Lab A' },
      createdBy: contributor.id,
      completedAt: new Date('2024-01-15'),
    },
    {
      projectId: medicalProject.id,
      categoryId: temperatureCategory.id,
      name: 'Low Temperature Test - Capacitors',
      description: 'Testing capacitor performance at -40°C',
      status: 'completed',
      commonData: { component: 'CAP-100uF-16V', temperature: -40, duration: 24, result: 'Pass' },
      customData: { capacitance: 98.5, esr: 0.12 },
      metadata: { equipment: 'Climate Chamber XL-200', operator: 'Jane Smith' },
      createdBy: contributor.id,
      completedAt: new Date('2024-01-20'),
    },
    {
      projectId: automotiveProject.id,
      categoryId: temperatureCategory.id,
      name: 'Thermal Cycling - Power Supply Unit',
      description: 'Cycling between -20°C and +70°C',
      status: 'in_progress',
      commonData: { component: 'PSU-24V-5A', temperature: 70, duration: 72, result: 'Inconclusive' },
      customData: { cycles: 15, currentCycle: 8 },
      metadata: { equipment: 'Thermal Cycler TC-500' },
      createdBy: contributor.id,
    },
  ])

  yield* db.insert(tests).values([
    {
      projectId: avionicsProject.id,
      categoryId: vibrationCategory.id,
      name: 'Random Vibration Test - Connector Assembly',
      description: 'Testing connector durability under random vibration',
      status: 'completed',
      commonData: { component: 'CONN-25PIN-DSUB', frequency: 50, amplitude: 2.5, duration: 120, result: 'Pass' },
      customData: { axes: 'XYZ', peakAcceleration: 5 },
      metadata: { equipment: 'Vibration Table VT-3000', operator: 'Mike Johnson' },
      createdBy: contributor.id,
      completedAt: new Date('2024-02-01'),
    },
    {
      projectId: automotiveProject.id,
      categoryId: vibrationCategory.id,
      name: 'Sine Vibration - PCB Assembly',
      description: 'Sinusoidal vibration testing of complete PCB',
      status: 'failed',
      commonData: { component: 'PCB-MAIN-2024', frequency: 100, amplitude: 1.5, duration: 60, result: 'Fail' },
      customData: { failureMode: 'Solder joint failure', failureTime: 45 },
      metadata: { equipment: 'Vibration Table VT-3000', operator: 'Sarah Lee' },
      createdBy: contributor.id,
      completedAt: new Date('2024-02-05'),
    },
  ])

  yield* db.insert(tests).values([
    {
      projectId: avionicsProject.id,
      categoryId: emsCategory.id,
      name: 'EMS Test - Microcontroller Unit',
      description: 'Testing MCU susceptibility to RF interference',
      status: 'completed',
      commonData: { component: 'MCU-STM32F4', fieldStrength: 10, frequency: 900, result: 'Pass' },
      customData: {},
      metadata: { equipment: 'RF Chamber RC-2000', operator: 'Tom Wilson', standard: 'IEC 61000-4-3' },
      createdBy: contributor.id,
      completedAt: new Date('2024-02-10'),
    },
    {
      projectId: medicalProject.id,
      categoryId: emsCategory.id,
      name: 'EMS Test - Power Supply',
      description: 'Testing power supply under electromagnetic stress',
      status: 'draft',
      commonData: { component: 'PSU-12V-10A', fieldStrength: 20, frequency: 1800, result: 'Degraded Performance' },
      customData: {},
      metadata: { standard: 'IEC 61000-4-3' },
      createdBy: regularUser.id,
    },
  ])

  console.log('✅ Created 8 tests\n')

  console.log('✨ Database seed completed successfully!\n')
  console.log('📊 Summary:')
  console.log('   - 4 users (1 master, 1 archivist, 1 contributor, 1 user)')
  console.log('   - 3 categories (Temperature, Vibration, EMS)')
  console.log('   - 3 projects (Avionics, Automotive, Medical)')
  console.log('   - 8 tests (various statuses)')
  console.log('🔑 Login credentials (all users):')
  console.log('   Email: alice@re-astr.com (master)')
  console.log('   Email: bob@re-astr.com (archivist)')
  console.log('   Email: charlie@re-astr.com (contributor)')
  console.log('   Email: diana@re-astr.com (user)')
  console.log('   Password: Password123!\n')
}).pipe(Effect.tapError((error) => Effect.sync(() => console.error('❌ Seed failed:', error))))

NodeRuntime.runMain(seed.pipe(Effect.provide(DatabaseLive)))
