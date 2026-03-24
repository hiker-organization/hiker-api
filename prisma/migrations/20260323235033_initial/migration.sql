-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADM');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "nome_exibicao" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "foto_url" TEXT,
    "reputacao" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resetPasswordToken" TEXT,
    "resetPasswordExpires" TIMESTAMP(3),

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_local" TEXT NOT NULL,
    "qnt_likes" INTEGER NOT NULL DEFAULT 0,
    "qnt_dislikes" INTEGER NOT NULL DEFAULT 0,
    "qnt_denuncia" INTEGER NOT NULL DEFAULT 0,
    "is_oculto" BOOLEAN NOT NULL DEFAULT false,
    "nota" INTEGER NOT NULL DEFAULT 0,
    "descricao" TEXT NOT NULL,
    "foto_url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Review_id_usuario_idx" ON "Review"("id_usuario");

-- CreateIndex
CREATE INDEX "Review_id_local_idx" ON "Review"("id_local");

-- CreateIndex
CREATE UNIQUE INDEX "Denuncia_id_usuario_id_review_key" ON "Denuncia"("id_usuario", "id_review");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Denuncia" ADD CONSTRAINT "Denuncia_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Denuncia" ADD CONSTRAINT "Denuncia_id_review_fkey" FOREIGN KEY ("id_review") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
