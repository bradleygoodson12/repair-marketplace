import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UploadRepairDocumentForm } from './upload-form';

export default async function UploadRepairDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  // Carried through login/signup via their existing ?redirect= mechanism, so
  // a client who isn't signed in yet still lands back here with the referral
  // intact instead of losing it at the login wall.
  const target = ref ? `/request/upload?ref=${encodeURIComponent(ref)}` : '/request/upload';

  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`/login?redirect=${encodeURIComponent(target)}`);

  // Dropped silently rather than erroring — a stale or mistyped ref should
  // never block someone from uploading their report.
  const inspector = ref ? await prisma.inspectorPartner.findUnique({ where: { slug: ref, active: true } }) : null;

  return <UploadRepairDocumentForm inspectorRef={inspector?.slug ?? null} />;
}
