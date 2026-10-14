-- CreateTable
CREATE TABLE "Local" (
    "place_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cidade" TEXT,
    "estado" TEXT,
    "sigla_estado" TEXT,
    "pais" TEXT,
    "sigla_pais" TEXT,
    "is_cidade" BOOLEAN NOT NULL DEFAULT false,
    "endereco" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Local_pkey" PRIMARY KEY ("place_id")
);
