// o esnext só ta olhando para as tipagens em src e em test (futuramente importante)
// então, referenciar tipagem diretamente em arquivos fora dessas pastas, para não dar ruim.
/// <reference types="node" /> 
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
