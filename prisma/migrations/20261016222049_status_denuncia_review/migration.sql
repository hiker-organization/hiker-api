-- CreateEnum
CREATE TYPE "Status_Review" AS ENUM ('AUTORIZADA', 'ANALISE', 'OFENSIVA');

-- CreateEnum
CREATE TYPE "Status_Denuncia" AS ENUM ('ATIVA', 'FECHADA');

-- AlterTable
ALTER TABLE "Denuncia" ADD COLUMN     "status" "Status_Denuncia" NOT NULL DEFAULT 'ATIVA';

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "status" "Status_Review" NOT NULL DEFAULT 'AUTORIZADA';
