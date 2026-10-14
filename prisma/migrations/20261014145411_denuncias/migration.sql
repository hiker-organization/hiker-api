/*
  Warnings:

  - Added the required column `categoria` to the `Denuncia` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Denuncia" ADD COLUMN     "categoria" TEXT NOT NULL,
ALTER COLUMN "descricao" DROP NOT NULL;
