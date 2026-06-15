-- CreateTable
CREATE TABLE "Token_refresh" (
    "id" SERIAL NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "id_usuario" INTEGER NOT NULL,

    CONSTRAINT "Token_refresh_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Token_refresh_token_hash_key" ON "Token_refresh"("token_hash");

-- CreateIndex
CREATE INDEX "Token_refresh_id_usuario_idx" ON "Token_refresh"("id_usuario");

-- AddForeignKey
ALTER TABLE "Token_refresh" ADD CONSTRAINT "Token_refresh_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
