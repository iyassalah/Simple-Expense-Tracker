import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoryKind1743100000000 implements MigrationInterface {
  name = 'AddCategoryKind1743100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."category_kind" AS ENUM('income', 'expense')
    `);

    await queryRunner.query(`
      ALTER TABLE "categories"
      ADD COLUMN "kind" "public"."category_kind" NOT NULL DEFAULT 'expense'
    `);

    // Best-effort backfill: treat a category named "Salary" as income.
    await queryRunner.query(`
      UPDATE "categories"
      SET "kind" = 'income'
      WHERE lower("name") = 'salary'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "categories"
      DROP COLUMN "kind"
    `);
    await queryRunner.query(`DROP TYPE "public"."category_kind"`);
  }
}

