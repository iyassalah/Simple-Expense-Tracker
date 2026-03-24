import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBudgetsTable1743060000000 implements MigrationInterface {
  name = 'CreateBudgetsTable1743060000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "budgets" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "category_id" uuid NOT NULL,
        "cap_amount" numeric(14,4) NOT NULL,
        "period_start" TIMESTAMPTZ NOT NULL,
        "period_end" TIMESTAMPTZ NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_budgets_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "budgets"
      ADD CONSTRAINT "FK_budgets_category_id"
      FOREIGN KEY ("category_id") REFERENCES "categories"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "budgets"
      DROP CONSTRAINT "FK_budgets_category_id"
    `);
    await queryRunner.query(`DROP TABLE "budgets"`);
  }
}
