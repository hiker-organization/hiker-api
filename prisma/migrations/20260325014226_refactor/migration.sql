/*
  Warnings:

  - You are about to drop the column `resetPasswordExpires` on the `Usuario` table. All the data in the column will be lost.
  - You are about to drop the column `resetPasswordToken` on the `Usuario` table. All the data in the column will be lost.
  - Added the required column `data_nascimento` to the `Usuario` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numero_celular` to the `Usuario` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Usuario" DROP COLUMN "resetPasswordExpires",
DROP COLUMN "resetPasswordToken",
ADD COLUMN     "data_nascimento" TEXT NOT NULL,
ADD COLUMN     "expiracao_reset_senha" TIMESTAMP(3),
ADD COLUMN     "numero_celular" TEXT NOT NULL,
ADD COLUMN     "token_reset_senha" TEXT;
