import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: 'Appliance Repair', slug: 'appliance-repair', icon: '🧊', description: 'Refrigerators, washers, dryers, ovens & more' },
  { name: 'Plumbing', slug: 'plumbing', icon: '🚰', description: 'Leaks, clogs, water heaters, fixture installs' },
  { name: 'Electrical', slug: 'electrical', icon: '💡', description: 'Wiring, outlets, panels, lighting' },
  { name: 'HVAC', slug: 'hvac', icon: '🌡️', description: 'Heating, cooling & ventilation repair' },
  { name: 'Handyman', slug: 'handyman', icon: '🛠️', description: 'General repairs & small home projects' },
  { name: 'Roofing', slug: 'roofing', icon: '🏠', description: 'Leak repair, shingle replacement, inspections' },
  { name: 'Painting', slug: 'painting', icon: '🎨', description: 'Interior & exterior painting' },
  { name: 'Flooring', slug: 'flooring', icon: '🧱', description: 'Repair & install hardwood, tile, carpet' },
];

async function main() {
  const categories = await Promise.all(
    CATEGORIES.map((c) =>
      prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c }),
    ),
  );

  const passwordHash = await bcrypt.hash('password123', 10);

  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      name: 'Casey Customer',
      email: 'customer@example.com',
      passwordHash,
      role: 'CUSTOMER',
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
      create: { name: p.name, email: p.email, passwordHash, role: 'PRO' },
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
