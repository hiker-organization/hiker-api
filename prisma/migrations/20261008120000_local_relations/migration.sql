-- Search of places ignoring accents ("jundiai" finds "Jundiaí").
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Places of the reviews made before a Local was created with the review. Saved with the
-- name only, so the foreign key can be created; scripts/backfill-locais.ts completes them
-- with the Google details.
INSERT INTO "Local" ("place_id", "nome", "updatedAt")
SELECT DISTINCT ON ("id_local") "id_local", "local", CURRENT_TIMESTAMP
FROM "Review"
WHERE "id_local" NOT IN (SELECT "place_id" FROM "Local")
ORDER BY "id_local", "createdAt";

-- AlterTable
ALTER TABLE "Trilha" ADD COLUMN "id_local" TEXT;

-- CreateIndex
CREATE INDEX "Trilha_id_local_idx" ON "Trilha"("id_local");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_id_local_fkey" FOREIGN KEY ("id_local") REFERENCES "Local"("place_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trilha" ADD CONSTRAINT "Trilha_id_local_fkey" FOREIGN KEY ("id_local") REFERENCES "Local"("place_id") ON DELETE RESTRICT ON UPDATE CASCADE;
