import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AuditLogClient } from './AuditLogClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Audit Log - Admin Panel',
  description: 'Historia wszystkich akcji w systemie',
};

export default async function AuditLogPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  return <AuditLogClient />;
}

