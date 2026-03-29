import { MigrationInterface, QueryRunner } from 'typeorm';

const SEED_USER_ID = '11111111-1111-4111-8111-111111111111';
/** bcrypt hash for Password123! (cost 10) */
const SEED_PASSWORD_HASH =
  '$2b$10$qDLmu17Y6MAEMx1iaHAQT.zqMlIKuh81X/LXU5FhKxWFJ72KLwnrK';

export class UsersAuthAndUserScopedData1743200000000
  implements MigrationInterface
{
  name = 'UsersAuthAndUserScopedData1743200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(255) NOT NULL,
        "email" character varying(255) NOT NULL,
        "password_hash" character varying(255) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "refresh_sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" character varying(64) NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_refresh_sessions_user_id" UNIQUE ("user_id"),
        CONSTRAINT "PK_refresh_sessions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refresh_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `
      INSERT INTO "users" ("id", "name", "email", "password_hash")
      VALUES ($1, $2, $3, $4)
    `,
      [
        SEED_USER_ID,
        'Demo User',
        'demo@qashio.local',
        SEED_PASSWORD_HASH,
      ],
    );

    await queryRunner.query(`
      ALTER TABLE "categories" ADD COLUMN "user_id" uuid
    `);
    await queryRunner.query(
      `
      UPDATE "categories" SET "user_id" = $1
    `,
      [SEED_USER_ID],
    );
    await queryRunner.query(`
      ALTER TABLE "categories" ALTER COLUMN "user_id" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "categories" DROP CONSTRAINT "UQ_categories_name"
    `);
    await queryRunner.query(`
      ALTER TABLE "categories" ADD CONSTRAINT "UQ_categories_user_id_name" UNIQUE ("user_id", "name")
    `);
    await queryRunner.query(`
      ALTER TABLE "categories" ADD CONSTRAINT "FK_categories_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "transactions" ADD COLUMN "user_id" uuid
    `);
    await queryRunner.query(`
      UPDATE "transactions" t
      SET "user_id" = c."user_id"
      FROM "categories" c
      WHERE c."id" = t."category_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "transactions" ALTER COLUMN "user_id" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "budgets" ADD COLUMN "user_id" uuid
    `);
    await queryRunner.query(`
      UPDATE "budgets" b
      SET "user_id" = c."user_id"
      FROM "categories" c
      WHERE c."id" = b."category_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "budgets" ALTER COLUMN "user_id" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "budgets" ADD CONSTRAINT "FK_budgets_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "budgets" DROP CONSTRAINT "FK_budgets_user_id"
    `);
    await queryRunner.query(`ALTER TABLE "budgets" DROP COLUMN "user_id"`);

    await queryRunner.query(`
      ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_user_id"
    `);
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP COLUMN "user_id"`,
    );

    await queryRunner.query(`
      ALTER TABLE "categories" DROP CONSTRAINT "FK_categories_user_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "categories" DROP CONSTRAINT "UQ_categories_user_id_name"
    `);
    await queryRunner.query(`
      ALTER TABLE "categories" ADD CONSTRAINT "UQ_categories_name" UNIQUE ("name")
    `);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "user_id"`);

    await queryRunner.query(`DROP TABLE "refresh_sessions"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
