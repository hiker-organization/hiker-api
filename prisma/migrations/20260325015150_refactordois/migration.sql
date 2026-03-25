/*
  Warnings:

  - Changed the type of `data_nascimento` on the `Usuario` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Usuario" DROP COLUMN "data_nascimento",
ADD COLUMN     "data_nascimento" TIMESTAMP(3) NOT NULL;
