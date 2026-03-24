import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Category } from './categories/entities/category.entity';

/**
 * Used by TypeORM CLI only (`npm run migration:run`, `migration:generate`, …).
 * Loads `.env` from the project root via `dotenv/config`.
 */
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [Category],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
