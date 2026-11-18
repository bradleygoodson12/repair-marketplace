import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { authOptions } from '@/lib/auth';
import { UploadRepairDocumentForm } from './upload-form';

export default async function UploadRepairDocumentPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login?redirect=/request/upload');

  return <UploadRepairDocumentForm />;
}
