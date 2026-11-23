-- CreateTable
CREATE TABLE "Recomendacao" (
    "user_id" INTEGER NOT NULL,
    "post_id" INTEGER NOT NULL,
    "rank" SMALLINT NOT NULL,
    "modelo_versao" TEXT,
    "gerado_em" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "recomendacoes_pkey" PRIMARY KEY ("user_id","post_id")
);

-- CreateIndex
CREATE INDEX "recomendacoes_user_rank_idx" ON "Recomendacao"("user_id", "rank");

-- AddForeignKey
ALTER TABLE "Recomendacao" ADD CONSTRAINT "Recomendacao_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recomendacao" ADD CONSTRAINT "Recomendacao_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
