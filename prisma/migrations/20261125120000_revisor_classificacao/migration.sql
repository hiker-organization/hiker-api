-- AlterTable
ALTER TABLE "Classificacao_review" ADD COLUMN "id_revisor" INTEGER;

-- AddForeignKey
ALTER TABLE "Classificacao_review" ADD CONSTRAINT "Classificacao_review_id_revisor_fkey" FOREIGN KEY ("id_revisor") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
