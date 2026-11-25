-- CreateTable
CREATE TABLE "Classificacao_review" (
    "id" SERIAL NOT NULL,
    "id_review" INTEGER NOT NULL,
    "ofensivo" BOOLEAN NOT NULL,
    "probabilidade" DOUBLE PRECISION NOT NULL,
    "modelo_versao" TEXT NOT NULL,
    "revisado_em" TIMESTAMP(3),
    "decisao_admin" "Status_Review",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Classificacao_review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Classificacao_review_id_review_key" ON "Classificacao_review"("id_review");

-- CreateIndex
CREATE INDEX "Classificacao_review_ofensivo_idx" ON "Classificacao_review"("ofensivo");

-- AddForeignKey
ALTER TABLE "Classificacao_review" ADD CONSTRAINT "Classificacao_review_id_review_fkey" FOREIGN KEY ("id_review") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
