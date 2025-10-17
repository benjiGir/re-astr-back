import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { UserRole } from '@database/schema/users.schema';
import { DatabaseService } from '@database/database.service';
import { users } from '@database/schema';
import { eq } from 'drizzle-orm';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  cookie: string;
}

/**
 * Sign up a new user and return authentication cookie
 */
export async function signUp(
  app: INestApplication,
  userData: {
    name: string;
    email: string;
    password: string;
  },
): Promise<{ cookie: string; response: request.Response }> {
  const response = await request(app.getHttpServer())
    .post('/auth/sign-up')
    .send(userData)
    .expect(201);

  const cookie = extractCookie(response);

  return { cookie, response };
}

/**
 * Sign in an existing user and return authentication cookie
 */
export async function signIn(
  app: INestApplication,
  credentials: {
    email: string;
    password: string;
  },
): Promise<{ cookie: string; response: request.Response }> {
  const response = await request(app.getHttpServer())
    .post('/auth/sign-in')
    .send(credentials)
    .expect(200);

  const cookie = extractCookie(response);

  return { cookie, response };
}

/**
 * Create a user with specific role and return authenticated session
 * This bypasses sign-up validation and directly creates the user in DB
 */
export async function createAuthenticatedUser(
  app: INestApplication,
  userData: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  },
): Promise<AuthenticatedUser> {
  // First, sign up the user (this creates user + account)
  const { cookie } = await signUp(app, {
    name: userData.name,
    email: userData.email,
    password: userData.password,
  });

  // Update the role in the database
  const databaseService = app.get(DatabaseService);
  const db = databaseService.getDatabase();

  const [user] = await db
    .update(users)
    .set({ role: userData.role })
    .where(eq(users.email, userData.email))
    .returning();

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    cookie,
  };
}

/**
 * Extract authentication cookie from response
 */
export function extractCookie(response: request.Response): string {
  const setCookieHeader = response.headers['set-cookie'];

  if (!setCookieHeader) {
    throw new Error('No Set-Cookie header found in response');
  }

  // Better Auth uses 'better-auth.session_token' cookie
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : [setCookieHeader];

  const sessionCookie = cookies.find((cookie: string) =>
    cookie.startsWith('better-auth.session_token='),
  );

  if (!sessionCookie) {
    throw new Error('Session cookie not found in Set-Cookie header');
  }

  // Extract just the cookie string (name=value;...)
  return sessionCookie.split(';')[0];
}

/**
 * Get current session for a given cookie
 */
export async function getSession(
  app: INestApplication,
  cookie: string,
): Promise<request.Response> {
  return request(app.getHttpServer())
    .get('/auth/session')
    .set('Cookie', cookie)
    .expect(200);
}

/**
 * Sign out and invalidate session
 */
export async function signOut(
  app: INestApplication,
  cookie: string,
): Promise<request.Response> {
  return request(app.getHttpServer())
    .post('/auth/sign-out')
    .set('Cookie', cookie)
    .expect(200);
}