import { PrismaClient } from '@prisma/client';

import { CATEGORIES } from './categories';

// Reference data only — safe to run against production (and does, via the
// vercel-build script) on every deploy. Never put demo accounts or other
// fake data in this file; that belongs in seed.ts, which is dev/local only.
const prisma = new PrismaClient();

async function main() {
  const categories = await Promise.all(
    CATEGORIES.map((c) => prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c })),
  );
  console.log('Categories seeded:', categories.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
