'use client';

import { useSession as useNextAuthSession } from 'next-auth/react';
import { Role } from '@prisma/client';

interface UseSessionReturn {
  user: {
    id: string;
    email: string;
    name?: string | null;
    role: Role;
    companyId?: string;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isJobSeeker: boolean;
  isCompany: boolean;
  isSuperAdmin: boolean;
  update: () => void;
}

export function useSession(): UseSessionReturn {
  const { data: session, status, update } = useNextAuthSession();

  const user = session?.user || null;
  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';
  const isJobSeeker = user?.role === 'JOB_SEEKER';
  const isCompany = user?.role === 'COMPANY';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return {
    user,
    isAuthenticated,
    isLoading,
    isJobSeeker,
    isCompany,
    isSuperAdmin,
    update: () => update(),
  };
}
