export const mockSessionData = {
  session: {
    id: 'session-123',
    userId: 'user-123',
    expiresAt: new Date('2025-12-31'),
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    token: 'session-token-123',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
  },
  user: {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: true,
    image: null,
    role: 'user' as const,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
}

export const mockInvalidSessionData = null
