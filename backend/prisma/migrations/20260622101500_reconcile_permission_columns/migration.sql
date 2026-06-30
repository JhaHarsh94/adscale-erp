ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "module" TEXT NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "action" TEXT;
UPDATE "permissions" SET "action" = "name" WHERE "action" IS NULL;
ALTER TABLE "permissions" ALTER COLUMN "action" SET NOT NULL;
ALTER TABLE "permissions" ALTER COLUMN "module" DROP DEFAULT;
CREATE UNIQUE INDEX IF NOT EXISTS "permissions_module_action_key" ON "permissions"("module", "action");
