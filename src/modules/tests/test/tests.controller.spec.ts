import { ValidationPipe } from '@nestjs/common'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test, type TestingModule } from '@nestjs/testing'
import request from 'supertest'
import type { App } from 'supertest/types'
import { RolesGuard } from '@/auth/guards/roles.guard'
import { TestsController } from '../tests.controller'
import { TestsService } from '../tests.service'

jest.mock('@/auth/guards/auth.guard', () => ({
  AuthGuard: jest.fn().mockImplementation(() => ({ canActivate: () => true })),
}))

import { AuthGuard } from '@/auth/guards/auth.guard'

describe('TestsController (HTTP)', () => {
  let app: App
  const testsService = { search: jest.fn() }

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestsController],
      providers: [{ provide: TestsService, useValue: testsService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile()

    const nestApp = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    nestApp.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))
    await nestApp.init()
    await nestApp.getHttpAdapter().getInstance().ready()
    app = nestApp.getHttpServer()
    testsService.search.mockReset()
  })

  describe('POST /tests/search', () => {
    it('returns 200 (not 201) with matching tests', async () => {
      testsService.search.mockResolvedValue([{ id: 't1', name: 'Test 1' }])

      const res = await request(app).post('/tests/search').send({ search: 'foo' })

      expect(res.status).toBe(200)
      expect(res.body).toEqual([{ id: 't1', name: 'Test 1' }])
      expect(testsService.search).toHaveBeenCalledWith({ search: 'foo' })
    })

    it('rejects an invalid status value with 400', async () => {
      const res = await request(app).post('/tests/search').send({ status: 'not-a-status' })

      expect(res.status).toBe(400)
      expect(testsService.search).not.toHaveBeenCalled()
    })

    it('rejects a search string longer than 200 characters with 400', async () => {
      const res = await request(app)
        .post('/tests/search')
        .send({ search: 'a'.repeat(201) })

      expect(res.status).toBe(400)
      expect(testsService.search).not.toHaveBeenCalled()
    })

    it('strips unknown fields via whitelist validation', async () => {
      testsService.search.mockResolvedValue([])

      await request(app).post('/tests/search').send({ search: 'foo', evil: 'payload' })

      expect(testsService.search).toHaveBeenCalledWith({ search: 'foo' })
    })
  })
})
