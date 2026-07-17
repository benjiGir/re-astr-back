import { Effect, Schema } from 'effect'
import { HttpServerResponse } from 'effect/unstable/http'
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
} from 'effect/unstable/httpapi'
import type { Session } from '@/domain/schema/sessions.schema.js'
import type { User } from '@/domain/schema/users.schema.js'
import { Authorization } from '@/auth/Authorization.js'
import { sessionCookieSecurity, sign } from '@/auth/Cookie.js'
import { Credentials, InvalidCredentials, InvalidResetToken } from '@/auth/Credentials.js'
import { CurrentUser } from '@/auth/CurrentUser.js'
import { EmailAlreadyExists } from '@/modules/users/User.js'

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const Email = Schema.String.check(Schema.isPattern(EMAIL_PATTERN))
const Password = Schema.String.check(Schema.isMinLength(8))
const UserRoleSchema = Schema.Literals(['master', 'archivist', 'contributor', 'user'])

export class AuthUser extends Schema.Class<AuthUser>('AuthUser')({
  id: Schema.String,
  email: Schema.String,
  name: Schema.String,
  emailVerified: Schema.Boolean,
  role: UserRoleSchema,
  createdAt: Schema.DateFromString,
  updatedAt: Schema.DateFromString,
}) {}

export class AuthSessionInfo extends Schema.Class<AuthSessionInfo>('AuthSessionInfo')({
  id: Schema.String,
  expiresAt: Schema.DateFromString,
  token: Schema.String,
  ipAddress: Schema.NullOr(Schema.String),
  userAgent: Schema.NullOr(Schema.String),
}) {}

export class AuthResponse extends Schema.Class<AuthResponse>('AuthResponse')({
  user: AuthUser,
  session: AuthSessionInfo,
}) {}

export class SignUpBody extends Schema.Class<SignUpBody>('SignUpBody')({
  email: Email,
  password: Password,
  name: Schema.optional(Schema.String),
}) {}

export class SignInBody extends Schema.Class<SignInBody>('SignInBody')({
  email: Email,
  password: Schema.String,
}) {}

export class ForgotPasswordBody extends Schema.Class<ForgotPasswordBody>('ForgotPasswordBody')({
  email: Email,
  redirectTo: Schema.optional(Schema.String),
}) {}

export class ResetPasswordBody extends Schema.Class<ResetPasswordBody>('ResetPasswordBody')({
  newPassword: Password,
  token: Schema.String,
}) {}

export class MessageResponse extends Schema.Class<MessageResponse>('MessageResponse')({
  message: Schema.String,
  success: Schema.Literal(true),
}) {}

// Pick, not the full User/Session row — so this also accepts CurrentUser's
// shape (a superset of these fields, plus session data of its own) for
// getSession, not just the full rows Credentials.signUp/signIn return.
type AuthUserFields = Pick<
  User,
  'id' | 'email' | 'name' | 'emailVerified' | 'role' | 'createdAt' | 'updatedAt'
>
type AuthSessionFields = Pick<Session, 'id' | 'expiresAt' | 'token' | 'ipAddress' | 'userAgent'>

const toAuthUser = (user: AuthUserFields): AuthUser =>
  new AuthUser({
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: user.emailVerified,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  })

const toAuthSessionInfo = (session: AuthSessionFields): AuthSessionInfo =>
  new AuthSessionInfo({
    id: session.id,
    expiresAt: session.expiresAt,
    token: session.token,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
  })

/** Sign-up/sign-in — no cookie needed yet, so no Authorization middleware here. */
export const AuthGroup = HttpApiGroup.make('auth')
  .add(
    HttpApiEndpoint.post('signUp', '/auth/sign-up/email', {
      payload: SignUpBody,
      success: AuthResponse.pipe(HttpApiSchema.status(201)),
      error: EmailAlreadyExists,
    }),
  )
  .add(
    HttpApiEndpoint.post('signIn', '/auth/sign-in/email', {
      payload: SignInBody,
      success: AuthResponse,
      error: InvalidCredentials,
    }),
  )
  .add(
    HttpApiEndpoint.post('forgotPassword', '/auth/forgot-password', {
      payload: ForgotPasswordBody,
      success: MessageResponse,
    }),
  )
  .add(
    HttpApiEndpoint.post('resetPassword', '/auth/reset-password', {
      payload: ResetPasswordBody,
      success: MessageResponse,
      error: InvalidResetToken,
    }),
  )

/** Sign-out/get-session need to know who's asking, so they sit behind Authorization like any other resource. */
export const AuthSessionGroup = HttpApiGroup.make('authSession')
  .add(HttpApiEndpoint.post('signOut', '/auth/sign-out', { success: MessageResponse }))
  .add(HttpApiEndpoint.get('getSession', '/auth/get-session', { success: AuthResponse }))
  .middleware(Authorization)

// Same self-contained-mini-Api trick as ProjectsHttp.ts (see its comment) — avoids
// a circular import with the real Api (src/Api.ts).
class AuthAllApi extends HttpApi.make('re-astr').add(AuthGroup).add(AuthSessionGroup) {}

export const AuthGroupLive = HttpApiBuilder.group(AuthAllApi, 'auth', (handlers) =>
  Effect.gen(function* () {
    const credentials = yield* Credentials

    const respondWithSession = Effect.fn('AuthHttp.respondWithSession')(function* (result: {
      user: User
      session: Session
    }) {
      const signedCookie = yield* sign(result.session.token)
      yield* HttpApiBuilder.securitySetCookie(sessionCookieSecurity, signedCookie, {
        path: '/',
        expires: result.session.expiresAt,
      })
      return new AuthResponse({
        user: toAuthUser(result.user),
        session: toAuthSessionInfo(result.session),
      })
    })

    return handlers
      .handle('signUp', ({ payload }) =>
        Effect.andThen(
          credentials.signUp(payload.email, payload.password, payload.name),
          respondWithSession,
        ),
      )
      .handle('signIn', ({ payload }) =>
        Effect.andThen(credentials.signIn(payload.email, payload.password), respondWithSession),
      )
      .handle('forgotPassword', ({ payload }) =>
        Effect.as(
          credentials.requestPasswordReset(payload.email),
          new MessageResponse({ message: 'Password reset email sent', success: true }),
        ),
      )
      .handle('resetPassword', ({ payload }) =>
        Effect.as(
          credentials.resetPassword(payload.token, payload.newPassword),
          new MessageResponse({ message: 'Password successfully reset', success: true }),
        ),
      )
  }),
)

export const AuthSessionGroupLive = HttpApiBuilder.group(AuthAllApi, 'authSession', (handlers) =>
  Effect.gen(function* () {
    const credentials = yield* Credentials

    return handlers
      .handle('signOut', () =>
        Effect.gen(function* () {
          const user = yield* CurrentUser
          yield* credentials.signOut(user.session.id)

          // Encoding a hardcoded literal object as JSON cannot realistically fail —
          // orDie turns HttpBodyError into a defect so it doesn't leak into this
          // endpoint's declared (error-free) success contract.
          const response = yield* HttpServerResponse.json({
            message: 'Successfully signed out',
            success: true,
          }).pipe(Effect.orDie)

          return response.pipe(HttpServerResponse.removeCookie(sessionCookieSecurity.key))
        }),
      )
      .handle('getSession', () =>
        Effect.map(
          CurrentUser,
          (user) =>
            new AuthResponse({ user: toAuthUser(user), session: toAuthSessionInfo(user.session) }),
        ),
      )
  }),
)
