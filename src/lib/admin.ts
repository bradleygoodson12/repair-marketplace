import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';

/** Returns the session if the caller is an admin, otherwise null. */
export async function getAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'ADMIN') return null;
  return session;
}
