import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string })
const prisma = new PrismaClient({ adapter })

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

const seedUsers = [
  {
    nome_usuario: 'seed_ana_trilheira',
    nome_exibicao: 'Ana Trilheira',
    email: 'seed_ana@hiker.seed',
    data_nascimento: new Date('1995-03-15'),
    numero_celular: '11999991111',
  },
  {
    nome_usuario: 'seed_carlos_aventura',
    nome_exibicao: 'Carlos Aventura',
    email: 'seed_carlos@hiker.seed',
    data_nascimento: new Date('1990-07-22'),
    numero_celular: '11999992222',
  },
  {
    nome_usuario: 'seed_mariana_natureza',
    nome_exibicao: 'Mariana Natureza',
    email: 'seed_mariana@hiker.seed',
    data_nascimento: new Date('1998-11-08'),
    numero_celular: '11999993333',
  },
  {
    nome_usuario: 'seed_pedro_montanha',
    nome_exibicao: 'Pedro Montanha',
    email: 'seed_pedro@hiker.seed',
    data_nascimento: new Date('1987-05-30'),
    numero_celular: '11999994444',
  },
  {
    nome_usuario: 'seed_julia_sertao',
    nome_exibicao: 'Julia Sertão',
    email: 'seed_julia@hiker.seed',
    data_nascimento: new Date('2000-01-17'),
    numero_celular: '11999995555',
  },
]

async function main() {
  console.log('Iniciando seed de reviews...')

  const senhaHash = await bcrypt.hash('Seed@12345', 10)

  const usuarios = await Promise.all(
    seedUsers.map((u) =>
      prisma.usuario.upsert({
        where: { email: u.email },
        update: {},
        create: { ...u, senha: senhaHash },
      }),
    ),
  )

  console.log(`${usuarios.length} usuários seed garantidos.`)

  for (let i = 0; i < 50; i++) {
    const usuario = usuarios[i % usuarios.length]
    const local = locais[i % locais.length]
    const descricao = descricoes[i % descricoes.length]
    const nota = (i % 5) + 1

    await prisma.review.create({
      data: {
        id_usuario: usuario.id,
        id_local: local.id,
        local: local.nome,
        nota,
        descricao,
        qnt_likes: Math.floor(Math.random() * 40),
        qnt_dislikes: Math.floor(Math.random() * 8),
      },
    })
  }

  console.log('Seed concluído: 50 reviews criados.')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
