-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADM');

-- CreateEnum
CREATE TYPE "Tipo_voto" AS ENUM ('LIKE', 'DISLIKE');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nome_usuario" TEXT NOT NULL,
    "nome_exibicao" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "data_nascimento" TIMESTAMP(3) NOT NULL,
    "numero_celular" TEXT NOT NULL,
    "foto_url" TEXT,
    "reputacao" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cargo" "Role" NOT NULL DEFAULT 'USER',
    "banido" BOOLEAN NOT NULL DEFAULT false,
    "bloqueado" BOOLEAN NOT NULL DEFAULT false,
    "bloqueado_ate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_local" TEXT NOT NULL,
    "local" TEXT NOT NULL,
    "qnt_likes" INTEGER NOT NULL DEFAULT 0,
    "qnt_dislikes" INTEGER NOT NULL DEFAULT 0,
    "qnt_denuncia" INTEGER NOT NULL DEFAULT 0,
    "oculto" BOOLEAN NOT NULL DEFAULT false,
    "nota" INTEGER NOT NULL DEFAULT 0,
    "descricao" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voto_review" (
    "id" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_review" INTEGER NOT NULL,
    "tipo" "Tipo_voto" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Voto_review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Foto" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "id_review" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Foto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" SERIAL NOT NULL,
    "descritivo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag_review" (
    "id" SERIAL NOT NULL,
    "id_review" INTEGER NOT NULL,
    "id_tag" INTEGER NOT NULL,

    CONSTRAINT "Tag_review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Token_redefinicao_senha" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "id_usuario" INTEGER NOT NULL,

    CONSTRAINT "Token_redefinicao_senha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Denuncia" (
    "id" SERIAL NOT NULL,
    "descricao" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_usuario" INTEGER NOT NULL,
    "id_review" INTEGER NOT NULL,

    CONSTRAINT "Denuncia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Token_refresh" (
    "id" SERIAL NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "id_usuario" INTEGER NOT NULL,

    CONSTRAINT "Token_refresh_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_nome_usuario_key" ON "Usuario"("nome_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Review_id_usuario_idx" ON "Review"("id_usuario");

-- CreateIndex
CREATE INDEX "Review_id_local_idx" ON "Review"("id_local");

-- CreateIndex
CREATE INDEX "Voto_review_id_usuario_idx" ON "Voto_review"("id_usuario");

-- CreateIndex
CREATE INDEX "Voto_review_id_review_idx" ON "Voto_review"("id_review");

-- CreateIndex
CREATE UNIQUE INDEX "Voto_review_id_usuario_id_review_key" ON "Voto_review"("id_usuario", "id_review");

-- CreateIndex
CREATE INDEX "Foto_id_review_idx" ON "Foto"("id_review");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_descritivo_key" ON "Tag"("descritivo");

-- CreateIndex
CREATE INDEX "Token_redefinicao_senha_id_usuario_idx" ON "Token_redefinicao_senha"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "Denuncia_id_usuario_id_review_key" ON "Denuncia"("id_usuario", "id_review");

-- CreateIndex
CREATE UNIQUE INDEX "Token_refresh_token_hash_key" ON "Token_refresh"("token_hash");

-- CreateIndex
CREATE INDEX "Token_refresh_id_usuario_idx" ON "Token_refresh"("id_usuario");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voto_review" ADD CONSTRAINT "Voto_review_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voto_review" ADD CONSTRAINT "Voto_review_id_review_fkey" FOREIGN KEY ("id_review") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Foto" ADD CONSTRAINT "Foto_id_review_fkey" FOREIGN KEY ("id_review") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag_review" ADD CONSTRAINT "Tag_review_id_review_fkey" FOREIGN KEY ("id_review") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag_review" ADD CONSTRAINT "Tag_review_id_tag_fkey" FOREIGN KEY ("id_tag") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Token_redefinicao_senha" ADD CONSTRAINT "Token_redefinicao_senha_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Denuncia" ADD CONSTRAINT "Denuncia_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Denuncia" ADD CONSTRAINT "Denuncia_id_review_fkey" FOREIGN KEY ("id_review") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Token_refresh" ADD CONSTRAINT "Token_refresh_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
