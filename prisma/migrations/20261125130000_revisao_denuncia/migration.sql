-- AlterTable
ALTER TABLE "Denuncia" ADD COLUMN     "decisao" "Status_Review",
ADD COLUMN     "id_revisor" INTEGER,
ADD COLUMN     "revisado_em" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Denuncia" ADD CONSTRAINT "Denuncia_id_revisor_fkey" FOREIGN KEY ("id_revisor") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
