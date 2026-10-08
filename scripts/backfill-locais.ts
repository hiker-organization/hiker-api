// Completes with the Google Places details the places saved with only the name by the
// 20261008120000_local_relations migration (reviews made before Local was created with
// the review). Run once after the migration: npm run backfill:locais
// Safe to run again: only places without the country are fetched.
import 'dotenv/config';
import { PrismaService } from '../src/modules/prisma/prisma.service.js';
import { LocalService } from '../src/modules/local/local.service.js';

const prisma = new PrismaService();
const localService = new LocalService(prisma);

async function main() {
  const incompletos = await prisma.local.findMany({
    where: { pais: null },
    select: { place_id: true, nome: true },
  });
  console.log(`${incompletos.length} locais para completar.`);

  let completos = 0;
  const falhas: string[] = [];
  // One at a time, to stay far from the Places API rate limit.
  for (const local of incompletos) {
    try {
      await localService.fetch_and_save(local.place_id);
      completos++;
    } catch (e) {
      falhas.push(`${local.place_id} (${local.nome}): ${(e as Error).message}`);
    }
  }

  console.log(`${completos} locais completados.`);
  if (falhas.length > 0) {
    console.log(`${falhas.length} falharam e ficaram só com o nome:`);
    falhas.forEach((falha) => console.log(`  ${falha}`));
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
