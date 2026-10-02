-- CreateTable
CREATE TABLE "Trilha" (
    "id" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "cidade" TEXT,
    "estado" TEXT,
    "distancia_m" DOUBLE PRECISION NOT NULL,
    "passos" INTEGER NOT NULL,
    "duracao_s" INTEGER NOT NULL,
    "nota" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "rota" JSONB NOT NULL,
    "compartilhada" BOOLEAN NOT NULL DEFAULT false,
    "iniciada_em" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Trilha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Foto_trilha" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "id_trilha" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Foto_trilha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag_trilha" (
    "id" SERIAL NOT NULL,
    "id_trilha" INTEGER NOT NULL,
    "id_tag" INTEGER NOT NULL,

    CONSTRAINT "Tag_trilha_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Trilha_id_usuario_idx" ON "Trilha"("id_usuario");

-- CreateIndex
CREATE INDEX "Trilha_compartilhada_idx" ON "Trilha"("compartilhada");

-- CreateIndex
CREATE INDEX "Foto_trilha_id_trilha_idx" ON "Foto_trilha"("id_trilha");

-- CreateIndex
CREATE INDEX "Tag_trilha_id_trilha_idx" ON "Tag_trilha"("id_trilha");

-- AddForeignKey
ALTER TABLE "Trilha" ADD CONSTRAINT "Trilha_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Foto_trilha" ADD CONSTRAINT "Foto_trilha_id_trilha_fkey" FOREIGN KEY ("id_trilha") REFERENCES "Trilha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag_trilha" ADD CONSTRAINT "Tag_trilha_id_trilha_fkey" FOREIGN KEY ("id_trilha") REFERENCES "Trilha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag_trilha" ADD CONSTRAINT "Tag_trilha_id_tag_fkey" FOREIGN KEY ("id_tag") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
