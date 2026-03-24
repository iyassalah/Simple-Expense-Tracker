import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterTransactionsAmountNumeric1441742950000000
  implements MigrationInterface
{
  name = 'AlterTransactionsAmountNumeric1441742950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transactions"
      ALTER COLUMN "amount" TYPE numeric(14,4)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transactions"
      ALTER COLUMN "amount" TYPE numeric(12,2)
    `);
  }
}
