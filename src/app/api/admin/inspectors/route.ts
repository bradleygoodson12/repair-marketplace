import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getAdminSession } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  companyName: z.string().trim().min(1),
  contactName: z.string().trim().optional(),
  contactEmail: z.string().trim().email().optional().or(z.literal('')),
  contactPhone: z.string().trim().optional(),
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { companyName, contactName, contactEmail, contactPhone } = parsed.data;

  const base = slugify(companyName) || 'inspector';
  let slug = base;
  // Low-volume, admin-only creation — a short loop to dodge a collision is
  // simpler than reserving slugs up front.
  for (let suffix = 2; await prisma.inspectorPartner.findUnique({ where: { slug } }); suffix++) {
    slug = `${base}-${suffix}`;
  }

  const inspector = await prisma.inspectorPartner.create({
    data: {
      slug,
      companyName,
      contactName: contactName || null,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
    },
  });

  return NextResponse.json({ id: inspector.id, slug: inspector.slug });
}
