/**
 * Exemples de données pour comprendre la structure des schémas
 * Ce fichier n'est PAS utilisé en production, uniquement pour documentation
 */

import type { NewCategory, NewTest, NewTestFile } from './index';

// ==========================================
// EXEMPLE 1: Catégorie "Tests de Température"
// ==========================================

export const exampleCategory1: NewCategory = {
  name: 'Tests de Température',
  description: 'Validation des composants électroniques sous différentes conditions thermiques',

  // Champs communs à TOUS les tests de cette catégorie
  baseSchema: {
    fields: [
      {
        key: 'temperature',
        label: 'Température (°C)',
        type: 'number',
        required: true,
        validation: { min: -50, max: 150 },
        defaultValue: 25,
      },
      {
        key: 'humidity',
        label: 'Humidité relative (%)',
        type: 'number',
        required: true,
        validation: { min: 0, max: 100 },
        defaultValue: 50,
      },
      {
        key: 'duration',
        label: 'Durée du test (heures)',
        type: 'number',
        required: true,
        validation: { min: 0.1, max: 1000 },
      },
      {
        key: 'operator',
        label: 'Opérateur',
        type: 'text',
        required: true,
      },
    ],
  },

  // Règles pour les champs personnalisables (ajoutés par utilisateur)
  customFieldsSchema: {
    allowCustomFields: true,
    maxCustomFields: 10,
    allowedTypes: ['text', 'number', 'boolean', 'date', 'select'],
    fields: [], // Les champs custom seront ajoutés dynamiquement
  },
};

// Test utilisant cette catégorie
export const exampleTest1: NewTest = {
  categoryId: 'uuid-de-la-categorie', // Serait une vraie UUID en prod
  name: 'Test thermal cycling - PCB Rev 2.3',
  description: 'Validation de la résistance aux cycles thermiques de la révision 2.3',
  status: 'completed',

  // Données des champs communs (définis dans baseSchema)
  commonData: {
    temperature: 85,
    humidity: 45,
    duration: 48,
    operator: 'Jean Dupont',
  },

  // Données des champs personnalisés (ajoutés spécifiquement pour ce test)
  customData: {
    board_revision: 'Rev 2.3',
    serial_number: 'PCB-2024-00342',
    test_chamber: 'Chamber A1',
    voltage_applied: 12.5,
    pass_criteria: 'No visual damage, resistance < 1Ω',
  },

  // Métadonnées système
  metadata: {
    tags: ['thermal', 'cycling', 'pcb'],
    priority: 'high',
    project: 'Project Alpha',
    notes: 'Première validation avec nouveau matériau',
  },

  createdBy: 'user-uuid',
  completedAt: new Date('2025-01-15T14:30:00Z'),
};

// Fichiers associés à ce test
export const exampleTestFiles1: NewTestFile[] = [
  {
    testId: 'uuid-du-test',
    fileType: 'screenshot',
    originalFilename: 'before_test.jpg',
    storedFilename: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg',
    bucketName: 'test-archives',
    objectKey: 'tests/2025/01/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg',
    fileSize: 2458624, // ~2.4 MB
    mimeType: 'image/jpeg',
    checksum: '5d41402abc4b2a76b9719d911017c592',
    metadata: {
      description: 'Photo avant test',
      camera: 'Canon EOS R5',
      resolution: '4096x2730',
    },
    uploadedBy: 'user-uuid',
  },
  {
    testId: 'uuid-du-test',
    fileType: 'report',
    originalFilename: 'rapport_analyse_thermique.pdf',
    storedFilename: 'b2c3d4e5-f6a7-8901-bcde-f12345678901.pdf',
    bucketName: 'test-archives',
    objectKey: 'tests/2025/01/b2c3d4e5-f6a7-8901-bcde-f12345678901.pdf',
    fileSize: 1547892, // ~1.5 MB
    mimeType: 'application/pdf',
    checksum: '7d793037a0760186574b0282f2f435e7',
    metadata: {
      description: 'Rapport complet avec courbes de température',
      pages: 12,
      generated_by: 'ThermalAnalyzer Pro v3.2',
    },
    uploadedBy: 'user-uuid',
  },
];

// ==========================================
// EXEMPLE 2: Catégorie "Tests de Vibration"
// ==========================================

export const exampleCategory2: NewCategory = {
  name: 'Tests de Vibration',
  description: 'Validation de la résistance mécanique aux vibrations',

  baseSchema: {
    fields: [
      {
        key: 'frequency',
        label: 'Fréquence (Hz)',
        type: 'number',
        required: true,
        validation: { min: 1, max: 2000 },
      },
      {
        key: 'amplitude',
        label: 'Amplitude (mm)',
        type: 'number',
        required: true,
        validation: { min: 0.1, max: 50 },
      },
      {
        key: 'axis',
        label: 'Axe de vibration',
        type: 'select',
        required: true,
        options: ['X', 'Y', 'Z', 'XYZ'],
      },
      {
        key: 'duration_minutes',
        label: 'Durée (minutes)',
        type: 'number',
        required: true,
      },
    ],
  },

  customFieldsSchema: {
    allowCustomFields: true,
    maxCustomFields: 15,
    allowedTypes: ['text', 'number', 'boolean', 'date', 'select', 'textarea'],
  },
};

export const exampleTest2: NewTest = {
  categoryId: 'uuid-categorie-vibration',
  name: 'Vibration sweep 20-500Hz - Prototype Motor Mount',
  description: 'Test de balayage fréquentiel sur support moteur prototype',
  status: 'in_progress',

  commonData: {
    frequency: 250, // Fréquence actuelle
    amplitude: 5.2,
    axis: 'XYZ',
    duration_minutes: 120,
  },

  customData: {
    test_standard: 'ISO 16750-3',
    mounting_torque: '25 Nm',
    specimen_weight: '2.4 kg',
    accelerometer_positions: ['top', 'bottom', 'side'],
    expected_resonance: '180-220 Hz',
  },

  metadata: {
    tags: ['vibration', 'mechanical', 'prototype'],
    priority: 'critical',
    started_at: '2025-01-16T09:00:00Z',
  },

  createdBy: 'user-uuid',
};

// ==========================================
// EXEMPLE 3: Catégorie "Tests Logiciels"
// ==========================================

export const exampleCategory3: NewCategory = {
  name: 'Tests Logiciels',
  description: 'Tests unitaires, intégration et performance des applications',

  baseSchema: {
    fields: [
      {
        key: 'test_type',
        label: 'Type de test',
        type: 'select',
        required: true,
        options: ['unit', 'integration', 'e2e', 'performance', 'security'],
      },
      {
        key: 'framework',
        label: 'Framework utilisé',
        type: 'text',
        required: true,
      },
      {
        key: 'branch',
        label: 'Branche Git',
        type: 'text',
        required: true,
      },
      {
        key: 'commit_hash',
        label: 'Commit SHA',
        type: 'text',
        required: false,
        validation: { pattern: '^[a-f0-9]{7,40}$' },
      },
      {
        key: 'environment',
        label: 'Environnement',
        type: 'select',
        required: true,
        options: ['development', 'staging', 'production'],
      },
    ],
  },

  customFieldsSchema: {
    allowCustomFields: true,
    maxCustomFields: 20,
    allowedTypes: ['text', 'number', 'boolean', 'date', 'select', 'textarea', 'url'],
  },
};

export const exampleTest3: NewTest = {
  categoryId: 'uuid-categorie-software',
  name: 'Load Test - API Gateway v2.1.0',
  description: 'Test de charge sur la nouvelle version de l\'API Gateway',
  status: 'completed',

  commonData: {
    test_type: 'performance',
    framework: 'k6 v0.48.0',
    branch: 'release/v2.1.0',
    commit_hash: 'a3f7b2c',
    environment: 'staging',
  },

  customData: {
    concurrent_users: 5000,
    test_duration: '30 minutes',
    requests_per_second: 12500,
    avg_response_time: '45ms',
    p95_response_time: '120ms',
    p99_response_time: '280ms',
    error_rate: '0.02%',
    cpu_usage_peak: '67%',
    memory_usage_peak: '4.2GB',
    passed: true,
  },

  metadata: {
    tags: ['performance', 'api', 'load-test'],
    jenkins_build: '1234',
    grafana_dashboard: 'https://grafana.example.com/d/abc123',
  },

  createdBy: 'user-uuid',
  completedAt: new Date('2025-01-16T15:45:00Z'),
};