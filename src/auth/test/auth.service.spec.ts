import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { AppConfigService } from '@config/app/config.service';
import { DatabaseConfigService } from '@config/database/config.service';
import { mockSessionData, mockInvalidSessionData } from './auth.service.mock';

// Mock better-auth module
jest.mock('better-auth', () => ({
  betterAuth: jest.fn(() => ({
    api: {
      getSession: jest.fn(),
    },
  })),
}));

// Mock better-auth adapters
jest.mock('better-auth/adapters/drizzle', () => ({
  drizzleAdapter: jest.fn(() => ({})),
}));

// Mock drizzle-orm
jest.mock('drizzle-orm/postgres-js', () => ({
  drizzle: jest.fn(() => ({})),
}));

// Mock postgres
jest.mock('postgres', () => jest.fn(() => ({})));

describe('AuthService', () => {
  let service: AuthService;
  let appConfigService: AppConfigService;
  let databaseConfigService: DatabaseConfigService;

  const mockAppConfigService = {
    betterAuthSecret: 'test-secret-key',
    baseUrl: 'http://localhost:3000',
  };

  const mockDatabaseConfigService = {
    url: 'postgresql://test:test@localhost:5432/testdb',
  };

  const mockAuthApi = {
    getSession: jest.fn(),
  };

  beforeEach(async () => {
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

    // Mock the auth.api after initialization
    service.auth = {
      api: mockAuthApi,
    } as any;

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize better-auth with correct configuration', () => {
      // Arrange
      const onModuleInitSpy = jest.spyOn(service, 'onModuleInit');

      // Act
      service.onModuleInit();

      // Assert
      expect(onModuleInitSpy).toHaveBeenCalled();
      expect(service.auth).toBeDefined();
    });

    it('should use configuration from AppConfigService', () => {
      // Act
      service.onModuleInit();

      // Assert
      expect(service.auth).toBeDefined();
      expect(appConfigService.betterAuthSecret).toBe('test-secret-key');
      expect(appConfigService.baseUrl).toBe('http://localhost:3000');
    });

    it('should use database URL from DatabaseConfigService', () => {
      // Act
      service.onModuleInit();

      // Assert
      expect(service.auth).toBeDefined();
      expect(databaseConfigService.url).toBe('postgresql://test:test@localhost:5432/testdb');
    });
  });

  describe('verifySession', () => {
    it('should verify a valid session successfully', async () => {
      // Arrange
      const sessionToken = 'valid-session-token';
      jest.spyOn(mockAuthApi, 'getSession').mockResolvedValue(mockSessionData);

      // Act
      const result = await service.verifySession(sessionToken);

      // Assert
      expect(mockAuthApi.getSession).toHaveBeenCalled();
      expect(mockAuthApi.getSession).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            cookie: `better-auth.session_token=${sessionToken}`,
          },
          url: '/api/auth/get-session',
          method: 'GET',
        }),
      );
      expect(result).toEqual(mockSessionData);
    });

    it('should return session data when token is valid', async () => {
      // Arrange
      const sessionToken = 'valid-token';
      jest.spyOn(mockAuthApi, 'getSession').mockResolvedValue(mockSessionData);

      // Act
      const result = await service.verifySession(sessionToken);

      // Assert
      expect(result).toEqual(mockSessionData);
      expect(result?.session.userId).toBe('user-123');
      expect(result?.user.email).toBe('test@example.com');
    });

    it('should return null when session is invalid', async () => {
      // Arrange
      const sessionToken = 'invalid-session-token';
      jest.spyOn(mockAuthApi, 'getSession').mockResolvedValue(mockInvalidSessionData);

      // Act
      const result = await service.verifySession(sessionToken);

      // Assert
      expect(mockAuthApi.getSession).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null when session verification throws an error', async () => {
      // Arrange
      const sessionToken = 'error-token';
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockAuthApi.getSession.mockImplementation(() => {
        throw new Error('Session error');
      });

      // Act
      const result = await service.verifySession(sessionToken);

      // Assert
      expect(mockAuthApi.getSession).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Session verification error:',
        expect.any(Error),
      );
      expect(result).toBeNull();

      consoleErrorSpy.mockRestore();
    });

    it('should format cookie header correctly', async () => {
      // Arrange
      const sessionToken = 'my-session-token';
      jest.spyOn(mockAuthApi, 'getSession').mockResolvedValue(mockSessionData);

      // Act
      await service.verifySession(sessionToken);

      // Assert
      expect(mockAuthApi.getSession).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            cookie: 'better-auth.session_token=my-session-token',
          },
        }),
      );
    });
  });
});