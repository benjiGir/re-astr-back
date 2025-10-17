import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  setupTestApp,
  cleanDatabase,
  closeTestApp,
} from './helpers/test-app.helper';
import {
  CategoryFactory,
  TestFactory,
} from './helpers/factories';
import { createTestUser } from './helpers/user.helper';
import { DatabaseService } from '@database/database.service';
import { categories } from '@database/schema';

describe('RBAC Permissions (E2E)', () => {
  let app: INestApplication;
  let databaseService: DatabaseService;

  beforeAll(async () => {
    app = await setupTestApp();
    databaseService = app.get(DatabaseService);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  beforeEach(async () => {
    await cleanDatabase(app);
  });

  describe('Categories Permissions', () => {
    it('user role - can read but NOT create categories', async () => {
      // Can read categories (no auth needed for GET)
      await request(app.getHttpServer())
        .get('/categories')
        .set('x-user-role', 'user')
        .expect(200);

      // Cannot create categories (requires contributor)
      const categoryData = CategoryFactory.build();
      await request(app.getHttpServer())
        .post('/categories')
        .set('x-user-role', 'user')
        .send(categoryData)
        .expect(403);
    });

    it('contributor role - can create categories but NOT delete', async () => {
      // Can create categories
      const categoryData = CategoryFactory.build();
      const createResponse = await request(app.getHttpServer())
        .post('/categories')
        .set('x-user-role', 'contributor')
        .send(categoryData)
        .expect(201);

      const categoryId = createResponse.body.id;

      // Cannot delete categories (requires archivist)
      await request(app.getHttpServer())
        .delete(`/categories/${categoryId}`)
        .set('x-user-role', 'contributor')
        .expect(403);
    });

    it('archivist role - can update and delete categories', async () => {
      // Create a category first
      const categoryData = CategoryFactory.build();
      const createResponse = await request(app.getHttpServer())
        .post('/categories')
        .set('x-user-role', 'contributor')
        .send(categoryData)
        .expect(201);

      const categoryId = createResponse.body.id;

      // Archivist can update
      await request(app.getHttpServer())
        .patch(`/categories/${categoryId}`)
        .set('x-user-role', 'archivist')
        .send({ name: 'Updated Name' })
        .expect(200);

      // Archivist can delete
      await request(app.getHttpServer())
        .delete(`/categories/${categoryId}`)
        .set('x-user-role', 'archivist')
        .expect(204);
    });

    it('master role - has all permissions on categories', async () => {
      // Can create
      const categoryData = CategoryFactory.build();
      const createResponse = await request(app.getHttpServer())
        .post('/categories')
        .set('x-user-role', 'master')
        .send(categoryData)
        .expect(201);

      const categoryId = createResponse.body.id;

      // Can read
      await request(app.getHttpServer())
        .get(`/categories/${categoryId}`)
        .set('x-user-role', 'master')
        .expect(200);

      // Can update
      await request(app.getHttpServer())
        .patch(`/categories/${categoryId}`)
        .set('x-user-role', 'master')
        .send({ name: 'Updated by Master' })
        .expect(200);

      // Can delete
      await request(app.getHttpServer())
        .delete(`/categories/${categoryId}`)
        .set('x-user-role', 'master')
        .expect(204);
    });
  });

  describe('Tests Permissions', () => {
    let categoryId: string;

    beforeEach(async () => {
      // Create a category for test creation
      const categoryData = CategoryFactory.build();
      const db = databaseService.getDatabase();
      const [category] = await db
        .insert(categories)
        .values(categoryData)
        .returning();

      categoryId = category.id;

      // Create a test user (for test creation later)
      await createTestUser(app, {
        name: 'Test User',
        email: 'test@example.com',
        role: 'contributor',
      });
    });

    it('user role - can read but NOT create tests', async () => {
      // Can read tests
      await request(app.getHttpServer())
        .get('/tests')
        .set('x-user-role', 'user')
        .expect(200);

      // Cannot create tests (requires contributor)
      const testData = TestFactory.build({ categoryId });
      await request(app.getHttpServer())
        .post('/tests')
        .set('x-user-role', 'user')
        .send(testData)
        .expect(403);
    });

    it('contributor role - can create and update tests but NOT delete', async () => {
      // Can create tests
      const testData = TestFactory.build({ categoryId });
      const createResponse = await request(app.getHttpServer())
        .post('/tests')
        .set('x-user-role', 'contributor')
        .send(testData)
        .expect(201);

      const testId = createResponse.body.id;

      // Can update tests
      await request(app.getHttpServer())
        .patch(`/tests/${testId}`)
        .set('x-user-role', 'contributor')
        .send({ status: 'completed' })
        .expect(200);

      // Cannot delete tests (requires archivist)
      await request(app.getHttpServer())
        .delete(`/tests/${testId}`)
        .set('x-user-role', 'contributor')
        .expect(403);
    });

    it('archivist role - can delete tests', async () => {
      // Create a test first
      const testData = TestFactory.build({ categoryId });
      const createResponse = await request(app.getHttpServer())
        .post('/tests')
        .set('x-user-role', 'contributor')
        .send(testData)
        .expect(201);

      const testId = createResponse.body.id;

      // Archivist can delete
      await request(app.getHttpServer())
        .delete(`/tests/${testId}`)
        .set('x-user-role', 'archivist')
        .expect(204);
    });
  });

  describe('Users Permissions', () => {
    it('user role - can read users but NOT modify roles', async () => {
      const user = await createTestUser(app, {
        name: 'Regular User',
        email: 'user@test.com',
        role: 'user',
      });

      // Can read users
      await request(app.getHttpServer())
        .get('/users')
        .set('x-user-role', 'user')
        .expect(200);

      // Cannot assign roles (requires master)
      await request(app.getHttpServer())
        .patch(`/users/${user.id}/role`)
        .set('x-user-role', 'user')
        .send({ role: 'contributor' })
        .expect(403);
    });

    it('contributor/archivist role - cannot manage users', async () => {
      const targetUser = await createTestUser(app, {
        name: 'Target User',
        email: 'target@test.com',
        role: 'user',
      });

      // Cannot assign roles (requires master)
      await request(app.getHttpServer())
        .patch(`/users/${targetUser.id}/role`)
        .set('x-user-role', 'archivist')
        .send({ role: 'contributor' })
        .expect(403);

      // Cannot delete users (requires master)
      await request(app.getHttpServer())
        .delete(`/users/${targetUser.id}`)
        .set('x-user-role', 'archivist')
        .expect(403);
    });

    it('master role - can assign roles and delete users', async () => {
      const targetUser = await createTestUser(app, {
        name: 'Target User',
        email: 'target@test.com',
        role: 'user',
      });

      // Can assign roles
      await request(app.getHttpServer())
        .patch(`/users/${targetUser.id}/role`)
        .set('x-user-role', 'master')
        .send({ role: 'contributor' })
        .expect(200);

      // Can delete users
      await request(app.getHttpServer())
        .delete(`/users/${targetUser.id}`)
        .set('x-user-role', 'master')
        .expect(204);
    });
  });
});