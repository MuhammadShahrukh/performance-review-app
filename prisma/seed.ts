import { PrismaClient, Role, Grade, Decision } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // ─── USERS ───────────────────────────────────────────────────────────────

  const cto = await prisma.user.upsert({
    where: { email: 'hussain@myalfred.com' },
    update: {},
    create: { id: 'cto-1', name: 'Hussain Fakhruddin', email: 'hussain@myalfred.com', role: Role.CTO },
  })

  const teamLead = await prisma.user.upsert({
    where: { email: 'shahrukh@myalfred.com' },
    update: {},
    create: { id: 'tl-1', name: 'Shahrukh Khan', email: 'shahrukh@myalfred.com', role: Role.TEAM_LEAD },
  })

  const employees = await Promise.all([
    prisma.user.upsert({ where: { email: 'qamar@myalfred.com' }, update: {}, create: { id: 'emp-1', name: 'Qamar Shahzad', email: 'qamar@myalfred.com', role: Role.EMPLOYEE } }),
  ])

  console.log(`✓ Seeded ${2 + employees.length} users`)

  // ─── DIMENSIONS ──────────────────────────────────────────────────────────

  const dimensions = await Promise.all([
    prisma.dimension.upsert({ where: { id: 'dim-1' }, update: {}, create: { id: 'dim-1', name: 'Delivery & Reliability' } }),
    prisma.dimension.upsert({ where: { id: 'dim-2' }, update: {}, create: { id: 'dim-2', name: 'Code Quality' } }),
    prisma.dimension.upsert({ where: { id: 'dim-3' }, update: {}, create: { id: 'dim-3', name: 'Collaboration' } }),
    prisma.dimension.upsert({ where: { id: 'dim-4' }, update: {}, create: { id: 'dim-4', name: 'Initiative & Ownership' } }),
  ])

  console.log(`✓ Seeded ${dimensions.length} dimensions`)

  // ─── QUESTIONS ───────────────────────────────────────────────────────────

  const questions = await Promise.all([
    // Delivery & Reliability
    prisma.question.upsert({ where: { id: 'q-1'  }, update: {}, create: { id: 'q-1',  dimensionId: 'dim-1', text: 'Delivered assigned tasks on time this month?' } }),
    prisma.question.upsert({ where: { id: 'q-2'  }, update: {}, create: { id: 'q-2',  dimensionId: 'dim-1', text: 'Handled production issues / incidents responsibly?' } }),
    prisma.question.upsert({ where: { id: 'q-3'  }, update: {}, create: { id: 'q-3',  dimensionId: 'dim-1', text: 'Required minimal follow-up or escalation?' } }),
    // Code Quality
    prisma.question.upsert({ where: { id: 'q-4'  }, update: {}, create: { id: 'q-4',  dimensionId: 'dim-2', text: 'Produced clean, maintainable code?' } }),
    prisma.question.upsert({ where: { id: 'q-5'  }, update: {}, create: { id: 'q-5',  dimensionId: 'dim-2', text: 'Participated in code reviews effectively?' } }),
    prisma.question.upsert({ where: { id: 'q-6'  }, update: {}, create: { id: 'q-6',  dimensionId: 'dim-2', text: 'Reduced or managed tech debt responsibly?' } }),
    // Collaboration
    prisma.question.upsert({ where: { id: 'q-7'  }, update: {}, create: { id: 'q-7',  dimensionId: 'dim-3', text: 'Communicated effectively with the team?' } }),
    prisma.question.upsert({ where: { id: 'q-8'  }, update: {}, create: { id: 'q-8',  dimensionId: 'dim-3', text: 'Helped unblock teammates when needed?' } }),
    prisma.question.upsert({ where: { id: 'q-9'  }, update: {}, create: { id: 'q-9',  dimensionId: 'dim-3', text: 'Contributed to documentation or knowledge sharing?' } }),
    // Initiative & Ownership
    prisma.question.upsert({ where: { id: 'q-10' }, update: {}, create: { id: 'q-10', dimensionId: 'dim-4', text: 'Proactively identified and raised problems?' } }),
    prisma.question.upsert({ where: { id: 'q-11' }, update: {}, create: { id: 'q-11', dimensionId: 'dim-4', text: 'Went beyond assigned scope when needed?' } }),
    prisma.question.upsert({ where: { id: 'q-12' }, update: {}, create: { id: 'q-12', dimensionId: 'dim-4', text: 'Proposed improvements to process, tooling, or architecture?' } }),
  ])

  console.log(`✓ Seeded ${questions.length} questions`)

  // ─── MONTHLY ENTRIES + ANSWERS (January 2026) ────────────────────────────
  //
  // Grade grid (cols = q1–q12):
  //   E = EXCEEDS (3), M = MEETS (2), B = BELOW (1)
  //
  // emp-1 Qamar: E E M | E M M | E E M | E M E  → final 2.58 → EXCEEDS

  const E = Grade.EXCEEDS
  const M = Grade.MEETS

  const entryData: Array<{ entryId: string; empId: string; grades: Grade[] }> = [
    { entryId: 'me-1', empId: 'emp-1', grades: [E, E, M, E, M, M, E, E, M, E, M, E] },
  ]

  const questionIds = ['q-1','q-2','q-3','q-4','q-5','q-6','q-7','q-8','q-9','q-10','q-11','q-12']

  for (const { entryId, empId, grades } of entryData) {
    const entry = await prisma.monthlyEntry.upsert({
      where: { developerId_month_year: { developerId: empId, month: 1, year: 2026 } },
      update: {},
      create: { id: entryId, developerId: empId, month: 1, year: 2026 },
    })

    for (let i = 0; i < 12; i++) {
      await prisma.monthlyEntryAnswer.upsert({
        where: { id: `${entryId}-a${i + 1}` },
        update: {},
        create: {
          id: `${entryId}-a${i + 1}`,
          monthlyEntryId: entry.id,
          questionId: questionIds[i],
          grade: grades[i],
        },
      })
    }
  }

  console.log(`✓ Seeded 1 monthly entry with 12 answers`)

  // ─── APPRAISALS ──────────────────────────────────────────────────────────

  await prisma.appraisal.upsert({
    where: { developerId_year: { developerId: 'emp-1', year: 2026 } },
    update: {},
    create: {
      id: 'apr-1',
      developerId: 'emp-1',
      year: 2026,
      finalGrade: Grade.EXCEEDS,
      decision: Decision.PENDING,
      ctoNote: null,
    },
  })

  console.log(`✓ Seeded 1 appraisal record`)
  console.log('\nSeed complete.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
