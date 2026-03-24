import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTransactionsTable1742868000000 implements MigrationInterface {
  name = 'CreateTransactionsTable1742868000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."transaction_type" AS ENUM('income', 'expense')
    `);
    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "amount" numeric(12,2) NOT NULL,
        "type" "public"."transaction_type" NOT NULL,
        "date" TIMESTAMPTZ NOT NULL,
        "category_id" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transactions_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD CONSTRAINT "FK_transactions_category_id"
      FOREIGN KEY ("category_id") REFERENCES "categories"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transactions"
      DROP CONSTRAINT "FK_transactions_category_id"
    `);
    await queryRunner.query(`DROP TABLE "transactions"`);
    await queryRunner.query(`DROP TYPE "public"."transaction_type"`);
  }
}

