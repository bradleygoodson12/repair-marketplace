import { put } from '@vercel/blob';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { extractRepairItemsFromPdf } from '@/lib/anthropic';
import { renderPdfPages } from '@/lib/pdf-render';
import { prisma } from '@/lib/prisma';

// Claude can take well past Vercel's default function timeout to read and
// analyze a multi-page PDF; without this the function gets killed mid-call
// and the client request just hangs instead of getting a clean error.
export const maxDuration = 60;

const schema = z.object({
  fileUrl: z.string().url(),
  filename: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'CUSTOMER') {
    return NextResponse.json({ error: 'Only customers can upload a repair document.' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { fileUrl, filename } = parsed.data;

  const document = await prisma.repairDocument.create({
    data: {
      customerId: session.user.id,
      fileUrl,
      originalFilename: filename,
      status: 'PROCESSING',
    },
  });

  const categories = await prisma.category.findMany({ select: { id: true, slug: true, name: true } });
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
  const fallbackCategory = categoryBySlug.get('handyman') ?? categories[0];

  try {
    const extracted = await extractRepairItemsFromPdf(fileUrl, categories);

    if (extracted.items.length === 0) {
      throw new Error("We couldn't find any repair items in that document.");
    }

    // Best-effort: render the page each item came from and attach it as a
    // photo. A rendering failure here shouldn't fail the whole upload —
    // the extracted items are still useful without page images.
    const pageImageUrls = new Map<number, string>();
    try {
      const pdfResponse = await fetch(fileUrl);
      const pdfBytes = new Uint8Array(await pdfResponse.arrayBuffer());
      const pageNumbers = extracted.items.map((item) => item.pageNumber);
      const rendered = await renderPdfPages(pdfBytes, pageNumbers);

      for (const [pageNumber, pngBuffer] of rendered) {
        const blob = await put(`repair-docs/page-${pageNumber}.png`, pngBuffer, {
          access: 'public',
          addRandomSuffix: true,
          contentType: 'image/png',
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        pageImageUrls.set(pageNumber, blob.url);
      }
    } catch {
      // Leave pageImageUrls empty; items are created without photos below.
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
            pageImageUrl: pageImageUrls.get(item.pageNumber) ?? null,
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not analyze that document.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ id: document.id });
}
