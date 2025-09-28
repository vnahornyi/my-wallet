-- Ensure required extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop legacy foreign keys before renaming tables/columns
ALTER TABLE "Expense" DROP CONSTRAINT IF EXISTS "Expense_userId_fkey";
ALTER TABLE "Expense" DROP CONSTRAINT IF EXISTS "Expense_categoryId_fkey";
ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_userId_fkey";

-- Drop legacy indexes if they still exist
DROP INDEX IF EXISTS "Category_userId_idx";
DROP INDEX IF EXISTS "Expense_userId_idx";
DROP INDEX IF EXISTS "Expense_categoryId_idx";

-- Rename tables to match new naming convention
ALTER TABLE "User" RENAME TO "users";
ALTER TABLE "Category" RENAME TO "categories";
ALTER TABLE "Expense" RENAME TO "expenses";

-- Rename primary key and unique constraints
ALTER TABLE "users" RENAME CONSTRAINT "User_pkey" TO "users_pkey";
ALTER TABLE "users" RENAME CONSTRAINT "User_email_key" TO "users_email_key";
ALTER TABLE "categories" RENAME CONSTRAINT "Category_pkey" TO "categories_pkey";
ALTER TABLE "expenses" RENAME CONSTRAINT "Expense_pkey" TO "expenses_pkey";

-- Update users table columns
ALTER TABLE "users" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "users" DROP COLUMN IF EXISTS "updatedAt";
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "users" ALTER COLUMN "plan" SET DEFAULT 'free';
UPDATE "users" SET "plan" = 'free' WHERE "plan" IS NULL;
ALTER TABLE "users" ALTER COLUMN "plan" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- Update categories table columns
ALTER TABLE "categories" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "categories" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "categories" DROP COLUMN IF EXISTS "updatedAt";
ALTER TABLE "categories" ALTER COLUMN "color" DROP NOT NULL;
ALTER TABLE "categories" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "icon" TEXT;
ALTER TABLE "categories" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- Update expenses table columns
ALTER TABLE "expenses" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "expenses" RENAME COLUMN "categoryId" TO "category_id";
ALTER TABLE "expenses" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "expenses" DROP COLUMN IF EXISTS "updatedAt";
ALTER TABLE "expenses" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- Recreate indexes using new naming conventions
CREATE INDEX IF NOT EXISTS "categories_user_id_idx" ON "categories" ("user_id");
CREATE INDEX IF NOT EXISTS "expenses_user_id_date_idx" ON "expenses" ("user_id", "date");
CREATE INDEX IF NOT EXISTS "expenses_category_id_idx" ON "expenses" ("category_id");

-- Add new subscriptions table
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "user_id" TEXT NOT NULL,
  "plan" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "started_at" TIMESTAMPTZ NOT NULL,
  "expires_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "subscriptions_user_id_idx" ON "subscriptions" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_user_id_status_key" ON "subscriptions" ("user_id", "status");

-- Recreate foreign keys with updated references and policies
ALTER TABLE "categories"
  ADD CONSTRAINT "categories_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "expenses"
  ADD CONSTRAINT "expenses_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "expenses"
  ADD CONSTRAINT "expenses_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "categories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
