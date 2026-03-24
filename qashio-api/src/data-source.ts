import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Category } from './categories/entities/category.entity';
import { Transaction } from './transactions/entities/transaction.entity';

/**
 * Used by TypeORM CLI only (`npm run migration:run`, `migration:generate`, …).
 * Loads `.env` from the project root via `dotenv/config`.
 */
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [Category, Transaction],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
