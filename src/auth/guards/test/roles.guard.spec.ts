import type { UserRole } from '@database/schema/users.schema'
import { type ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '@/auth/decorators/roles.decorator'
import { RolesGuard } from '../roles.guard'

describe('RolesGuard', () => {
  let guard: RolesGuard
  let reflector: Reflector

  beforeEach(() => {
    reflector = new Reflector()
    guard = new RolesGuard(reflector)
  })

  const createMockExecutionContext = (userRole: UserRole): ExecutionContext => {
    const mockRequest = {
      headers: {
        'x-user-role': userRole,
      },
    }

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext
  }

  describe('canActivate', () => {
    it('should allow access when no roles are required', () => {
      const context = createMockExecutionContext('user')
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined)

      const result = guard.canActivate(context)

      expect(result).toBe(true)
    })

    it('should allow access when no roles array is empty', () => {
      const context = createMockExecutionContext('user')
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([])

      const result = guard.canActivate(context)

      expect(result).toBe(true)
    })

    it('should allow master to access all endpoints', () => {
      const context = createMockExecutionContext('master')
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['user'])

      const result = guard.canActivate(context)

      expect(result).toBe(true)
    })

    it('should allow archivist to access contributor endpoints', () => {
      const context = createMockExecutionContext('archivist')
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['contributor'])

      const result = guard.canActivate(context)

      expect(result).toBe(true)
    })

    it('should allow contributor to access user endpoints', () => {
      const context = createMockExecutionContext('contributor')
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['user'])

      const result = guard.canActivate(context)

      expect(result).toBe(true)
    })

    it('should deny user access to contributor endpoints', () => {
      const context = createMockExecutionContext('user')
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['contributor'])

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
    })

    it('should deny user access to archivist endpoints', () => {
      const context = createMockExecutionContext('user')
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['archivist'])

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
    })

    it('should deny user access to master endpoints', () => {
      const context = createMockExecutionContext('user')
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['master'])

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
    })

    it('should deny contributor access to archivist endpoints', () => {
      const context = createMockExecutionContext('contributor')
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['archivist'])

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
    })

    it('should deny contributor access to master endpoints', () => {
      const context = createMockExecutionContext('contributor')
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['master'])

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
    })

    it('should deny archivist access to master endpoints', () => {
      const context = createMockExecutionContext('archivist')
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['master'])

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
    })

    it('should throw ForbiddenException when user role is not found in headers', () => {
      const mockRequest = {
        headers: {},
      }

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['user'])

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
      expect(() => guard.canActivate(context)).toThrow('User role not found')
    })

    it('should include required roles in error message', () => {
      const context = createMockExecutionContext('user')
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['master', 'archivist'])

      expect(() => guard.canActivate(context)).toThrow(
        'Insufficient permissions. Required roles: master, archivist',
      )
    })

    it('should check roles from both handler and class metadata', () => {
      const context = createMockExecutionContext('master')
      const spy = jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['master'])

      guard.canActivate(context)

      expect(spy).toHaveBeenCalledWith(ROLES_KEY, [context.getHandler(), context.getClass()])
    })
  })
})
