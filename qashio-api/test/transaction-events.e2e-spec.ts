import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';

/** Matches migration seed user `UsersAuthAndUserScopedData1743200000000`. */
const E2E_DEMO_USER_ID = '11111111-1111-4111-8111-111111111111';
import { BudgetsService } from '../src/budgets/budgets.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import {
  TRANSACTION_CREATED,
  TRANSACTION_UPDATED,
} from '../src/transaction-events/transaction-events.constants';
import { CategoryKind } from '../src/categories/entities/category.entity';
import { TransactionType } from '../src/transactions/entities/transaction.entity';

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

/** Lets `@OnEvent(..., { async: true })` handlers run before assertions. */
async function flushAsyncListeners(): Promise<void> {
  await new Promise<void>((r) => setImmediate(r));
  await new Promise<void>((r) => setImmediate(r));
}

/** Async listeners perform DB I/O; poll briefly so assertions run after work finishes. */
async function waitForCondition(
  predicate: () => boolean,
  timeoutMs = 5000,
  stepMs = 25,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await new Promise<void>((r) => setTimeout(r, stepMs));
  }
  throw new Error(`waitForCondition timed out after ${timeoutMs}ms`);
}

(hasDatabaseUrl ? describe : describe.skip)(
  'Transaction events (e2e)',
  () => {
    jest.setTimeout(30_000);
    let app: INestApplication<App>;
    let moduleFixture: TestingModule;
    let emitSpy: jest.SpyInstance;
    let warnSpy: jest.SpyInstance;
    let getUsageSpy: jest.SpyInstance;

    beforeAll(async () => {
      warnSpy = jest.spyOn(
        BudgetsService.prototype,
        'warnIfBudgetsExceededAfterExpense',
      );
      getUsageSpy = jest.spyOn(BudgetsService.prototype, 'getUsage');

      moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({
          canActivate(context: ExecutionContext) {
            const req = context.switchToHttp().getRequest();
            req.user = {
              sub: E2E_DEMO_USER_ID,
              email: 'demo@qashio.local',
              name: 'Demo User',
            };
            return true;
          },
        })
        .compile();

      app = moduleFixture.createNestApplication();
      app.useGlobalFilters(new HttpExceptionFilter());
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      await app.init();

      const emitter = app.get(EventEmitter2);
      emitSpy = jest.spyOn(emitter, 'emit');
    });

    afterAll(async () => {
      await flushAsyncListeners();
      await new Promise<void>((r) => setTimeout(r, 150));
      warnSpy.mockRestore();
      getUsageSpy.mockRestore();
      emitSpy.mockRestore();
      await app.close();
    });

    beforeEach(() => {
      emitSpy.mockClear();
      warnSpy.mockClear();
      getUsageSpy.mockClear();
    });

    afterEach(async () => {
      await flushAsyncListeners();
    });

    it('emits transaction.created with payload after POST /transactions', async () => {
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const categoryRes = await request(app.getHttpServer())
        .post('/categories')
        .send({ name: `E2E Events Cat ${suffix}`, kind: CategoryKind.EXPENSE })
        .expect(201);

      const categoryId = categoryRes.body.id as string;
      const txDate = new Date().toISOString();

      const txRes = await request(app.getHttpServer())
        .post('/transactions')
        .send({
          amount: 10.5,
          type: TransactionType.EXPENSE,
          categoryId,
          date: txDate,
        })
        .expect(201);

      expect(emitSpy).toHaveBeenCalledWith(
        TRANSACTION_CREATED,
        expect.objectContaining({
          transactionId: txRes.body.id,
          categoryId,
          amount: 10.5,
          type: TransactionType.EXPENSE,
        }),
      );
    });

    it('emits transaction.updated after PUT /transactions/:id', async () => {
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const categoryRes = await request(app.getHttpServer())
        .post('/categories')
        .send({ name: `E2E Update Cat ${suffix}`, kind: CategoryKind.EXPENSE })
        .expect(201);
      const categoryId = categoryRes.body.id as string;
      const txDate = new Date().toISOString();

      const txRes = await request(app.getHttpServer())
        .post('/transactions')
        .send({
          amount: 20,
          type: TransactionType.EXPENSE,
          categoryId,
          date: txDate,
        })
        .expect(201);

      emitSpy.mockClear();

      await request(app.getHttpServer())
        .put(`/transactions/${txRes.body.id}`)
        .send({ amount: 25 })
        .expect(200);

      expect(emitSpy).toHaveBeenCalledWith(
        TRANSACTION_UPDATED,
        expect.objectContaining({
          transactionId: txRes.body.id,
          amount: 25,
        }),
      );
    });

    it('does not emit on DELETE /transactions/:id', async () => {
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const categoryRes = await request(app.getHttpServer())
        .post('/categories')
        .send({ name: `E2E Delete Cat ${suffix}`, kind: CategoryKind.EXPENSE })
        .expect(201);
      const categoryId = categoryRes.body.id as string;

      const txRes = await request(app.getHttpServer())
        .post('/transactions')
        .send({
          amount: 5,
          type: TransactionType.EXPENSE,
          categoryId,
          date: new Date().toISOString(),
        })
        .expect(201);

      emitSpy.mockClear();

      await request(app.getHttpServer())
        .delete(`/transactions/${txRes.body.id}`)
        .expect(204);

      expect(emitSpy).not.toHaveBeenCalled();
    });

    // Runs before the over-cap case so async `getUsage` from that test cannot leak into this one.
    it('does not call getUsage for income (budget listener no-ops inside service)', async () => {
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const categoryRes = await request(app.getHttpServer())
        .post('/categories')
        .send({ name: `E2E Income Cat ${suffix}`, kind: CategoryKind.INCOME })
        .expect(201);
      const categoryId = categoryRes.body.id as string;

      await request(app.getHttpServer())
        .post('/transactions')
        .send({
          amount: 999,
          type: TransactionType.INCOME,
          categoryId,
          date: new Date().toISOString(),
        })
        .expect(201);

      await flushAsyncListeners();

      expect(warnSpy).toHaveBeenCalledWith(
        E2E_DEMO_USER_ID,
        categoryId,
        expect.any(Date),
        TransactionType.INCOME,
      );
      expect(getUsageSpy).not.toHaveBeenCalled();
    });

    it('invokes budget threshold check for expense over cap (async listener)', async () => {
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const categoryRes = await request(app.getHttpServer())
        .post('/categories')
        .send({ name: `E2E Budget Cat ${suffix}`, kind: CategoryKind.EXPENSE })
        .expect(201);
      const categoryId = categoryRes.body.id as string;

      const periodStart = new Date('2000-01-01T00:00:00.000Z').toISOString();
      const periodEnd = new Date('2099-12-31T23:59:59.999Z').toISOString();

      await request(app.getHttpServer())
        .post('/budgets')
        .send({
          categoryId,
          capAmount: 100,
          periodStart,
          periodEnd,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/transactions')
        .send({
          amount: 150,
          type: TransactionType.EXPENSE,
          categoryId,
          date: new Date().toISOString(),
        })
        .expect(201);

      await waitForCondition(() => getUsageSpy.mock.calls.length > 0);

      expect(warnSpy).toHaveBeenCalledWith(
        E2E_DEMO_USER_ID,
        categoryId,
        expect.any(Date),
        TransactionType.EXPENSE,
      );
      expect(getUsageSpy).toHaveBeenCalled();
    });
  },
);
