import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { AppConfigService } from '@config/app/config.service';
import { DatabaseConfigService } from '@config/database/config.service';
import { mockSessionData } from './auth.service.mock';

jest.mock('better-auth', () => ({
  betterAuth: jest.fn(() => ({
    handler: jest.fn(),
  })),
}));

jest.mock('better-auth/adapters/drizzle', () => ({
  drizzleAdapter: jest.fn(() => ({})),
}));

jest.mock('drizzle-orm/postgres-js', () => ({
  drizzle: jest.fn(() => ({})),
}));

jest.mock('postgres', () => jest.fn(() => ({})));

describe('AuthService', () => {
  let service: AuthService;
  let appConfigService: AppConfigService;
  let databaseConfigService: DatabaseConfigService;
  let mockDb: any;

  const mockAppConfigService = {
    betterAuthSecret: 'test-secret-key',
    baseUrl: 'http://localhost:3000',
    emailPasswordEnabled: true,
    emailPasswordRequireEmailVerification: false,
    sessionExpiresIn: 604800,
    sessionUpdateAge: 86400,
  };

  const mockDatabaseConfigService = {
    url: 'postgresql://test:test@localhost:5432/testdb',
  };

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AppConfigService,
          useValue: mockAppConfigService,
        },
        {
          provide: DatabaseConfigService,
          useValue: mockDatabaseConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    appConfigService = module.get<AppConfigService>(AppConfigService);
    databaseConfigService = module.get<DatabaseConfigService>(DatabaseConfigService);

    service['db'] = mockDb;

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize better-auth with correct configuration', () => {
      const onModuleInitSpy = jest.spyOn(service, 'onModuleInit');

      service.onModuleInit();

      expect(onModuleInitSpy).toHaveBeenCalled();
      expect(service.auth).toBeDefined();
    });

    it('should use configuration from AppConfigService', () => {
      service.onModuleInit();

      expect(service.auth).toBeDefined();
      expect(appConfigService.betterAuthSecret).toBe('test-secret-key');
      expect(appConfigService.baseUrl).toBe('http://localhost:3000');
    });

    it('should use database URL from DatabaseConfigService', () => {
      service.onModuleInit();

      expect(service.auth).toBeDefined();
      expect(databaseConfigService.url).toBe('postgresql://test:test@localhost:5432/testdb');
    });
  });

  describe('verifySession', () => {
    it('should return null when sessionToken is empty', async () => {
      const result = await service.verifySession('');

      expect(result).toBeNull();
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('should return null when sessionToken is null', async () => {
      const result = await service.verifySession(null as any);

      expect(result).toBeNull();
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('should verify a valid session successfully', async () => {
      const sessionToken = 'valid-session-token';

      mockDb.limit
        .mockResolvedValueOnce([mockSessionData.session])
        .mockResolvedValueOnce([mockSessionData.user]);

      const result = await service.verifySession(sessionToken);

      expect(mockDb.select).toHaveBeenCalledTimes(2);
      expect(mockDb.from).toHaveBeenCalledTimes(2);
      expect(mockDb.where).toHaveBeenCalledTimes(2);
      expect(mockDb.limit).toHaveBeenCalledTimes(2);

      expect(result).toEqual({
        session: mockSessionData.session,
        user: mockSessionData.user,
      });
    });

    it('should return session data with correct structure', async () => {
      const sessionToken = 'valid-token';

      mockDb.limit
        .mockResolvedValueOnce([mockSessionData.session])
        .mockResolvedValueOnce([mockSessionData.user]);

      const result = await service.verifySession(sessionToken);

      expect(result).toBeDefined();
      expect(result?.session).toEqual(mockSessionData.session);
      expect(result?.user).toEqual(mockSessionData.user);
      expect(result?.session.userId).toBe('user-123');
      expect(result?.user.email).toBe('test@example.com');
    });

    it('should return null when session is not found', async () => {
      const sessionToken = 'invalid-session-token';

      mockDb.limit.mockResolvedValueOnce([]);

      const result = await service.verifySession(sessionToken);

      expect(mockDb.select).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    it('should return null when session is expired', async () => {
      const sessionToken = 'expired-token';
      const expiredSession = {
        ...mockSessionData.session,
        expiresAt: new Date('2020-01-01'),
      };

      mockDb.limit.mockResolvedValueOnce([expiredSession]);

      const result = await service.verifySession(sessionToken);

      expect(mockDb.select).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    it('should return null when user is not found', async () => {
      const sessionToken = 'valid-token-no-user';

      mockDb.limit
        .mockResolvedValueOnce([mockSessionData.session])
        .mockResolvedValueOnce([]);

      const result = await service.verifySession(sessionToken);

      expect(mockDb.select).toHaveBeenCalledTimes(2);
      expect(result).toBeNull();
    });

    it('should return null and log error when database query fails', async () => {
      const sessionToken = 'error-token';
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockDb.limit.mockRejectedValueOnce(new Error('Database error'));

      const result = await service.verifySession(sessionToken);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Session verification error:',
        expect.any(Error),
      );
      expect(result).toBeNull();

      consoleErrorSpy.mockRestore();
    });

    it('should accept valid session token format', async () => {
      const sessionToken = 'my-session-token-abc123';

      mockDb.limit
        .mockResolvedValueOnce([mockSessionData.session])
        .mockResolvedValueOnce([mockSessionData.user]);

      const result = await service.verifySession(sessionToken);

      expect(result).toBeDefined();
      expect(result?.session).toBeDefined();
      expect(result?.user).toBeDefined();
    });
  });
});
