import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { CATEGORIES } from './categories';

const prisma = new PrismaClient();

// Full dev/local seed: categories plus demo accounts (password123 for all).
// Never run this against production — demo-plus-known-password accounts
// have no business existing there. Production gets only seed-categories.ts,
// wired into the vercel-build script.
async function main() {
  const categories = await Promise.all(
    CATEGORIES.map((c) =>
      prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c }),
    ),
  );

  const passwordHash = await bcrypt.hash('password123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Alex Admin',
      email: 'admin@example.com',
      passwordHash,
      role: 'ADMIN',
      emailVerified: new Date(),
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      name: 'Casey Customer',
      email: 'customer@example.com',
      passwordHash,
      role: 'CUSTOMER',
      emailVerified: new Date(),
    },
  });

  const property = await prisma.property.upsert({
    where: { id: 'seed-property-1' },
    update: {},
    create: {
      id: 'seed-property-1',
      ownerId: customer.id,
      addressLine1: '123 Main St',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      propertyType: 'single_family',
    },
  });

  const proUsers = [
    { name: 'Jamie Fixer', email: 'jamie.pro@example.com', business: 'Fixer Jamie Repairs', cats: ['appliance-repair', 'handyman'] },
    { name: 'Morgan Plumb', email: 'morgan.pro@example.com', business: 'Morgan Plumbing Co.', cats: ['plumbing'] },
    { name: 'Riley Volt', email: 'riley.pro@example.com', business: 'Riley Electrical Services', cats: ['electrical', 'hvac'] },
  ];

  for (const p of proUsers) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: { name: p.name, email: p.email, passwordHash, role: 'PRO', emailVerified: new Date() },
    });

    const profile = await prisma.proProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        businessName: p.business,
        bio: `${p.business} has been serving the Austin area with reliable, high-quality repairs.`,
        yearsExperience: 8,
        hourlyRateCents: 8500,
        serviceZip: '78701',
        verified: true,
        avgRating: 4.8,
        reviewCount: 12,
      },
    });

    for (const slug of p.cats) {
      const category = categories.find((c) => c.slug === slug);
      if (!category) continue;
      await prisma.proProfileCategory.upsert({
        where: { proProfileId_categoryId: { proProfileId: profile.id, categoryId: category.id } },
        update: {},
        create: { proProfileId: profile.id, categoryId: category.id },
      });
    }
  }

  console.log('Seed complete:', {
    categories: categories.length,
    customer: customer.email,
    pros: proUsers.length,
  });
  console.log('Login for all seeded users: password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
