import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { suggestCategoryForJob } from '@/lib/anthropic';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';

const schema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'CUSTOMER') {
    return NextResponse.json({ error: 'Only customers can get a category suggestion.' }, { status: 403 });
  }

  // Each call hits Anthropic's API — cap per-user usage so a runaway client
  // or deliberate abuse can't rack up unbounded cost.
  const allowed = await checkRateLimit(`suggest-category:${session.user.id}`, 20, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many suggestion requests. Try again in a bit.' }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const categories = await prisma.category.findMany({ select: { id: true, slug: true, name: true } });

  try {
    const slug = await suggestCategoryForJob(parsed.data.title, parsed.data.description, categories);
    const matched = categories.find((c) => c.slug === slug);
    if (!matched) return NextResponse.json({ error: 'Could not match a category.' }, { status: 502 });
    return NextResponse.json({ categoryId: matched.id, categoryName: matched.name });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not suggest a category.' },
      { status: 502 },
    );
  }
}
