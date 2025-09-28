CREATE TABLE IF NOT EXISTS "budgets" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "user_id" TEXT NOT NULL,
  "category_id" TEXT,
  "amount" DECIMAL(18, 2) NOT NULL,
  "period" TEXT NOT NULL,
  "start_date" TIMESTAMPTZ NOT NULL,
  "end_date" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "budgets_user_id_idx" ON "budgets" ("user_id");
CREATE INDEX IF NOT EXISTS "budgets_category_id_idx" ON "budgets" ("category_id");

ALTER TABLE "budgets"
  ADD CONSTRAINT "budgets_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "budgets"
  ADD CONSTRAINT "budgets_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "categories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
