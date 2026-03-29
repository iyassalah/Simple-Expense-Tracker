import 'dotenv/config';
import { DataSource } from 'typeorm';
import { RefreshSession } from './auth/entities/refresh-session.entity';
import { Budget } from './budgets/entities/budget.entity';
import { Category } from './categories/entities/category.entity';
import { Transaction } from './transactions/entities/transaction.entity';
import { User } from './users/entities/user.entity';

/**
 * Used by TypeORM CLI only (`npm run migration:run`, `migration:generate`, …).
 * Loads `.env` from the project root via `dotenv/config`.
 */
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, RefreshSession, Category, Transaction, Budget],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
