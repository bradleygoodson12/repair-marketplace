import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const isRepairDocument = pathname.startsWith('repair-docs/');
        return {
          allowedContentTypes: isRepairDocument
            ? ['application/pdf']
            : ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
          maximumSizeInBytes: isRepairDocument ? 20 * 1024 * 1024 : 8 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // No DB write needed here — the uploaded URL is attached to the
        // request when the customer submits the job-posting form.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed.' },
      { status: 400 },
    );
  }
}
