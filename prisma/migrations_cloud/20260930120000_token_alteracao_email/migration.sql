-- CreateTable
CREATE TABLE "Token_alteracao_email" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "novo_email" TEXT NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "id_usuario" INTEGER NOT NULL,

    CONSTRAINT "Token_alteracao_email_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Token_alteracao_email_id_usuario_idx" ON "Token_alteracao_email"("id_usuario");

-- AddForeignKey
ALTER TABLE "Token_alteracao_email" ADD CONSTRAINT "Token_alteracao_email_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
