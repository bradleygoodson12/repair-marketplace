import { getServerSession } from 'next-auth';
import { NextResponse, after } from 'next/server';
import { z } from 'zod';

import { isOwnBlobUrl } from '@/lib/attachments';
import { authOptions } from '@/lib/auth';
import { extractRepairItemsFromPdf } from '@/lib/anthropic';
import { prisma } from '@/lib/prisma';

// Claude can take well past a normal request/response cycle to read and
// analyze a multi-page PDF. Rather than make the agent stare at a spinner
// for up to a minute, the route returns as soon as the document row exists
// and runs the actual analysis in the background via `after()` — the
// review page polls for READY/FAILED instead.
export const maxDuration = 60;

const blobUrl = z.string().url().refine(isOwnBlobUrl, 'Must be an uploaded file.');

const schema = z.object({
  fileUrl: blobUrl,
  filename: z.string().min(1),
  supportingDocumentUrls: z.array(blobUrl).default([]),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'CUSTOMER') {
    return NextResponse.json({ error: 'Only customers can upload a repair document.' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { fileUrl, filename, supportingDocumentUrls } = parsed.data;

  const document = await prisma.repairDocument.create({
    data: {
      customerId: session.user.id,
      fileUrl,
      originalFilename: filename,
      supportingDocumentUrls,
      status: 'PROCESSING',
    },
  });

  after(async () => {
    const categories = await prisma.category.findMany({ select: { id: true, slug: true, name: true } });
    const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
    const fallbackCategory = categoryBySlug.get('handyman') ?? categories[0];

    try {
      const extracted = await extractRepairItemsFromPdf(fileUrl, categories);

      if (extracted.items.length === 0) {
        throw new Error("We couldn't find any repair items in that document.");
      }

      await prisma.$transaction([
        prisma.repairDocument.update({
          where: { id: document.id },
          data: {
            status: 'READY',
            extractedAddressLine1: extracted.propertyAddressLine1 ?? null,
            extractedCity: extracted.propertyCity ?? null,
            extractedState: extracted.propertyState ?? null,
            extractedZip: extracted.propertyZip ?? null,
          },
        }),
        prisma.repairLineItem.createMany({
          data: extracted.items.map((item) => {
            const matched = categoryBySlug.get(item.categorySlug) ?? fallbackCategory;
            return {
              repairDocumentId: document.id,
              rawText: item.description,
              title: item.title,
              description: item.description,
              suggestedCategoryId: matched?.id ?? null,
              categoryId: matched?.id ?? null,
              pageNumber: item.pageNumber,
            };
          }),
        }),
      ]);
    } catch (error) {
      await prisma.repairDocument.update({
        where: { id: document.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Analysis failed.',
        },
      });
    }
  });

  return NextResponse.json({ id: document.id });
}
