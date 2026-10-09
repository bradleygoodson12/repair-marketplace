import { put } from '@vercel/blob';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';

const MAX_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const PDF_TYPE = 'application/pdf';

// file.name is attacker-controlled (a direct API request can set it to
// anything, not just what a real file picker would send) and becomes part
// of the public Blob URL. Keep it to safe characters and a sane length
// rather than trusting it verbatim.
function sanitizeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() || 'file';
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
  return cleaned || 'file';
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }

  const isPdf = file.type === PDF_TYPE;
  const allowedTypes = isPdf ? [PDF_TYPE] : IMAGE_TYPES;
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File is too large (max 4MB).' }, { status: 400 });
  }

  const prefix = isPdf ? 'repair-docs' : 'photos';
  const filename = sanitizeFilename(file.name);

  try {
    const blob = await put(`${prefix}/${filename}`, file, {
      access: 'public',
      addRandomSuffix: true,
      contentType: file.type,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed.' },
      { status: 502 },
    );
  }
}
