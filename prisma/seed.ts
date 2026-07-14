import { PrismaClient, Role, UserType, Team } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// Idempotent seed (safe to re-run on every deploy): upserts the two accounts
// and the questionnaire; never deletes anything.
const hash = (pw: string) => bcrypt.hashSync(pw, 10)

async function main() {
  // ─── USERS: CTO (admin) + Team Lead only ─────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'hussain@myalfred.com' },
    update: {},
    create: {
      id: 'cto-1',
      name: 'Hussain Fakhruddin',
      email: 'hussain@myalfred.com',
      password: hash('password123'),
      type: UserType.ADMIN,
      role: Role.CTO,
      team: null,
    },
  })

  await prisma.user.upsert({
    where: { email: 'shahrukh@myalfred.com' },
    update: {},
    create: {
      id: 'tl-1',
      name: 'Shahrukh Khan',
      email: 'shahrukh@myalfred.com',
      password: hash('password123'),
      type: UserType.MEMBER,
      role: Role.TEAM_LEAD,
      team: Team.API,
    },
  })

  console.log('✓ Seeded CTO + Team Lead')

  // ─── DIMENSIONS ──────────────────────────────────────────────────────────
  const dimensions = [
    { id: 'dim-1', name: 'Delivery & Reliability' },
    { id: 'dim-2', name: 'Code Quality' },
    { id: 'dim-3', name: 'Collaboration' },
    { id: 'dim-4', name: 'Initiative & Ownership' },
  ]
  for (const d of dimensions) {
    await prisma.dimension.upsert({
      where: { id: d.id },
      update: {},
      create: { id: d.id, name: d.name, active: true },
    })
  }
  console.log(`✓ Seeded ${dimensions.length} dimensions`)

  // ─── QUESTIONS ───────────────────────────────────────────────────────────
  const questions = [
    { id: 'q-1', dimensionId: 'dim-1', text: 'Delivered assigned tasks on time this month?' },
    { id: 'q-2', dimensionId: 'dim-1', text: 'Handled production issues / incidents responsibly?' },
    { id: 'q-3', dimensionId: 'dim-1', text: 'Required minimal follow-up or escalation?' },
    { id: 'q-4', dimensionId: 'dim-2', text: 'Produced clean, maintainable code?' },
    { id: 'q-5', dimensionId: 'dim-2', text: 'Participated in code reviews effectively?' },
    { id: 'q-6', dimensionId: 'dim-2', text: 'Reduced or managed tech debt responsibly?' },
    { id: 'q-7', dimensionId: 'dim-3', text: 'Communicated effectively with the team?' },
    { id: 'q-8', dimensionId: 'dim-3', text: 'Helped unblock teammates when needed?' },
    { id: 'q-9', dimensionId: 'dim-3', text: 'Contributed to documentation or knowledge sharing?' },
    { id: 'q-10', dimensionId: 'dim-4', text: 'Proactively identified and raised problems?' },
    { id: 'q-11', dimensionId: 'dim-4', text: 'Went beyond assigned scope when needed?' },
    { id: 'q-12', dimensionId: 'dim-4', text: 'Proposed improvements to process, tooling, or architecture?' },
  ]
  for (const q of questions) {
    await prisma.question.upsert({
      where: { id: q.id },
      update: {},
      create: { id: q.id, dimensionId: q.dimensionId, text: q.text, active: true },
    })
  }
  console.log(`✓ Seeded ${questions.length} questions`)

  console.log('\nSeed complete.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
