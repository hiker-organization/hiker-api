import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { BlobServiceClient } from '@azure/storage-blob'
import { PrismaClient } from '../generated/prisma/client.js'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string })
const prisma = new PrismaClient({ adapter })

const SEED_EMAIL_DOMAIN = '@hiker.seed'
const SEED_PASSWORD = 'Seed@12345'
const TOTAL_REVIEWS = 50
const REVIEW_PHOTO_POOL = 12

const locais = [
  { id: 'ChIJN1t_tDeuEmsRUsoyG83frY4', nome: 'Pico do Jaraguá' },
  { id: 'ChIJLfyY9bVZzpQRFJE7J3kBPDA', nome: 'Parque Estadual da Cantareira' },
  { id: 'ChIJbbqNLzRazpQRfRkWR3cGPDo', nome: 'Serra da Canastra' },
  { id: 'ChIJvQz3HiHizpQRpNrN1pO_HaA', nome: 'Chapada dos Veadeiros' },
  { id: 'ChIJU5pBi0cVzpQRfRkWR3cGPDo', nome: 'Parque Nacional do Itatiaia' },
  { id: 'ChIJd8BlQ2BZwokRsGHrLiQgBgQ', nome: 'Trilha do Ouro' },
  { id: 'ChIJN7dMJH5YzpQRkfJJJJJJJJJ', nome: 'Serra do Cipó' },
  { id: 'ChIJK2jYBJJYzpQRpNrN1pO_HaB', nome: 'Pedra do Baú' },
  { id: 'ChIJL3kZCKKZzpQRpNrN1pO_HaC', nome: 'Morro do Chapéu' },
  { id: 'ChIJM4lACLLazpQRpNrN1pO_HaD', nome: 'Serra do Mar' },
]

const descricoes = [
  'Trilha incrível com vista panorâmica no topo. Vale cada esforço da subida!',
  'Caminho bem sinalizado e com água disponível em alguns pontos. Recomendo para iniciantes.',
  'Paisagem de tirar o fôlego! Fui no amanhecer e a neblina estava perfeita.',
  'Trilha moderada com duração de aproximadamente 4 horas. Levar bastante água.',
  'Encontrei muita fauna local no caminho. Tartarugas e micos foram os destaques.',
  'O acesso está um pouco degradado, mas a vista do mirante compensa tudo.',
  'Ideal para ir com a família. Há opções de trilhas curtas e mais longas.',
  'A mata ciliar está bem preservada nesse trecho. Ótima trilha para fotografia.',
  'Cuidado com o trecho íngreme nos primeiros 2km. Depois fica mais tranquilo.',
  'Uma das melhores trilhas que já fiz no Brasil. Voltarei com certeza!',
  'Infraestrutura razoável, mas faltam placas de sinalização em alguns pontos.',
  'Na época das chuvas muito cuidado com o solo escorregadio. Levar botas.',
  'Cachoeira ao final da trilha é deslumbrante. Água gelada e cristalina.',
  'Trilha circular de 8km com desnível moderado. Duração média de 3 horas.',
  'Avisos de trilha bem sinalizados. Estrutura básica de sanitários disponível.',
  'Floresta Atlântica preservada, com muitas espécies de bromélias e orquídeas.',
  'Vista da cidade lá de cima é fantástica. Melhor no horário do pôr do sol.',
  'Percurso com muito lama após chuva. Planeje visitar em época de seca.',
  'Encontrei um grupo de andarilhos experientes que me deram ótimas dicas.',
  'O esforço físico é intenso, mas a recompensa visual é incomparável.',
  'Trajeto bem diversificado com trechos de mata fechada e campos abertos.',
  'Recomendo fortemente levar lanterna para explorar as grutas do percurso.',
  'Riacho de água limpa no meio da trilha é perfeito para descanso.',
  'O guia local conhece cada pedra do caminho, vale contratar a visita guiada.',
  'Temperatura bem mais fria no alto da serra. Levar agasalho sempre.',
]

const tags = [
  'iniciante',
  'moderada',
  'dificil',
  'cachoeira',
  'mirante',
  'camping',
  'familia',
  'pet friendly',
  'nascer do sol',
  'fotografia',
]

// nome_usuario follows the API convention: stored with '@' prefix, max 20 chars after it.
// avatar: pravatar image id, or null to keep the default avatar.
const seedUsers = [
  {
    nome_usuario: '@seed_ana_trilheira',
    nome_exibicao: 'Ana Trilheira',
    email: `seed_ana${SEED_EMAIL_DOMAIN}`,
    data_nascimento: new Date('1995-03-15'),
    numero_celular: '11999991111',
    avatar: 47,
  },
  {
    nome_usuario: '@seed_carlos_aventura',
    nome_exibicao: 'Carlos Aventura',
    email: `seed_carlos${SEED_EMAIL_DOMAIN}`,
    data_nascimento: new Date('1990-07-22'),
    numero_celular: '11999992222',
    avatar: 12,
  },
  {
    nome_usuario: '@seed_mari_natureza',
    nome_exibicao: 'Mariana Natureza',
    email: `seed_mariana${SEED_EMAIL_DOMAIN}`,
    data_nascimento: new Date('1998-11-08'),
    numero_celular: '11999993333',
    avatar: 32,
  },
  {
    nome_usuario: '@seed_pedro_montanha',
    nome_exibicao: 'Pedro Montanha',
    email: `seed_pedro${SEED_EMAIL_DOMAIN}`,
    data_nascimento: new Date('1987-05-30'),
    numero_celular: '11999994444',
    avatar: 59,
  },
  {
    nome_usuario: '@seed_julia_sertao',
    nome_exibicao: 'Julia Sertão',
    email: `seed_julia${SEED_EMAIL_DOMAIN}`,
    data_nascimento: new Date('2000-01-17'),
    numero_celular: '11999995555',
    avatar: null,
  },
]

function createBlobUploader() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
  const reviewsContainer = process.env.AZURE_STORAGE_CONTAINER_REVIEWS
  const usersContainer = process.env.AZURE_STORAGE_CONTAINER_USERS

  if (!connectionString || !reviewsContainer || !usersContainer) {
    console.warn('Azure Storage não configurado: seed seguirá sem imagens.')
    return null
  }

  const service = BlobServiceClient.fromConnectionString(connectionString)

  // Returns the blob name (what the API stores in the database), or null if it fails.
  return async (container: 'reviews' | 'users', blobName: string, sourceUrl: string) => {
    try {
      const response = await fetch(sourceUrl)
      if (!response.ok) throw new Error(`HTTP ${response.status} ao baixar ${sourceUrl}`)
      const buffer = Buffer.from(await response.arrayBuffer())

      const containerName = container === 'reviews' ? reviewsContainer : usersContainer
      await service
        .getContainerClient(containerName)
        .getBlockBlobClient(blobName)
        .uploadData(buffer, { blobHTTPHeaders: { blobContentType: 'image/jpeg' } })

      return blobName
    } catch (error) {
      console.warn(`Falha ao enviar imagem ${blobName}:`, (error as Error).message)
      return null
    }
  }
}

async function main() {
  console.log('Iniciando seed...')

  const upload = createBlobUploader()
  const senhaHash = await bcrypt.hash(SEED_PASSWORD, 10)

  const reviewPhotos: string[] = []
  if (upload) {
    for (let i = 1; i <= REVIEW_PHOTO_POOL; i++) {
      const name = `seed-review-${String(i).padStart(2, '0')}.jpg`
      const blob = await upload('reviews', name, `https://picsum.photos/seed/hiker-${i}/800/600`)
      if (blob) reviewPhotos.push(blob)
    }
    console.log(`${reviewPhotos.length} fotos de review enviadas ao Azure.`)
  }

  const usuarios = await Promise.all(
    seedUsers.map(async ({ avatar, ...user }) => {
      let foto_url: string | null = null
      if (upload && avatar !== null) {
        const slug = user.email.split('@')[0]
        foto_url = await upload('users', `${slug}.jpg`, `https://i.pravatar.cc/400?img=${avatar}`)
      }

      // update also migrates seed users created by older versions of this script.
      const data = { ...user, foto_url, senha: senhaHash, deletedAt: null }
      return prisma.usuario.upsert({
        where: { email: user.email },
        update: data,
        create: data,
      })
    }),
  )
  console.log(`${usuarios.length} usuários seed garantidos.`)

  // Makes the script safe to re-run: votes, photos and tag links cascade with the review.
  const removidas = await prisma.review.deleteMany({
    where: { autor: { email: { endsWith: SEED_EMAIL_DOMAIN } } },
  })
  if (removidas.count > 0) console.log(`${removidas.count} reviews seed antigas removidas.`)

  const tagRecords = await Promise.all(
    tags.map((descritivo) =>
      prisma.tag.upsert({ where: { descritivo }, update: {}, create: { descritivo } }),
    ),
  )

  for (let i = 0; i < TOTAL_REVIEWS; i++) {
    const autorIndex = i % usuarios.length
    const autor = usuarios[autorIndex]
    const local = locais[i % locais.length]

    // Each other seed user votes deterministically: 3/5 like, 1/5 dislike, 1/5 no vote.
    const votos = usuarios
      .filter((_, j) => j !== autorIndex)
      .map((votante, j) => {
        const roll = (i * 7 + j * 3) % 5
        const tipo = roll < 3 ? ('LIKE' as const) : roll === 3 ? ('DISLIKE' as const) : null
        return { votante, tipo }
      })
      .filter((v) => v.tipo !== null)

    const qntFotos = reviewPhotos.length > 0 ? i % 4 : 0
    const fotos = Array.from({ length: qntFotos }, (_, k) => reviewPhotos[(i + k) % reviewPhotos.length])

    const qntTags = i % 4
    const reviewTags = Array.from({ length: qntTags }, (_, k) => tagRecords[(i * 3 + k) % tagRecords.length])

    await prisma.review.create({
      data: {
        id_usuario: autor.id,
        id_local: local.id,
        local: local.nome,
        nota: (i % 5) + 1,
        descricao: descricoes[i % descricoes.length],
        createdAt: new Date(Date.now() - (TOTAL_REVIEWS - i) * 3 * 60 * 60 * 1000),
        qnt_likes: votos.filter((v) => v.tipo === 'LIKE').length,
        qnt_dislikes: votos.filter((v) => v.tipo === 'DISLIKE').length,
        interacoes: {
          create: votos.map((v) => ({ id_usuario: v.votante.id, tipo: v.tipo! })),
        },
        fotos: { create: fotos.map((url) => ({ url })) },
        tags: { create: reviewTags.map((tag) => ({ id_tag: tag.id })) },
      },
    })
  }
  console.log(`${TOTAL_REVIEWS} reviews criadas com votos, tags e fotos.`)

  // Same formula as ReviewService.calc_reputation.
  for (const usuario of usuarios) {
    const reviews = await prisma.review.findMany({
      where: { id_usuario: usuario.id },
      select: { qnt_likes: true, qnt_dislikes: true },
    })
    const likes = reviews.reduce((sum, r) => sum + r.qnt_likes, 0)
    const dislikes = reviews.reduce((sum, r) => sum + r.qnt_dislikes, 0)
    const reputacao = likes > 0 ? Math.max(0, ((likes - dislikes) / likes) * 10) : 0

    await prisma.usuario.update({ where: { id: usuario.id }, data: { reputacao } })
  }
  console.log('Reputação dos usuários recalculada.')

  console.log(`Seed concluído. Login: qualquer email ${SEED_EMAIL_DOMAIN} com a senha ${SEED_PASSWORD}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
