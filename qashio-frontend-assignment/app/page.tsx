'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import { getStoredAccessToken } from '@/lib/auth/token';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = getStoredAccessToken();
    if (token) {
      router.replace('/transactions');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '40vh',
      }}
    >
      <CircularProgress />
    </Box>
  );
}
