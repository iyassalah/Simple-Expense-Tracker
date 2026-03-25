'use client';

import { AppBar, Toolbar, Typography, Box, Button } from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavBar() {
  const pathname = usePathname();
  
  return (
    <AppBar position="static" color="primary" elevation={0}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Qashio
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            color="inherit"
            component={Link}
            href="/budgets"
            sx={{
              fontWeight: pathname === '/budgets' ? 'bold' : 'normal',
              textDecoration: pathname === '/budgets' ? 'underline' : 'none',
            }}
          >
            Budgets
          </Button>
          <Button
            color="inherit"
            component={Link}
            href="/categories"
            sx={{
              fontWeight: pathname === '/categories' ? 'bold' : 'normal',
              textDecoration: pathname === '/categories' ? 'underline' : 'none',
            }}
          >
            Categories
          </Button>
          <Button
            color="inherit"
            component={Link}
            href="/transactions"
            sx={{
              fontWeight: pathname === '/transactions' ? 'bold' : 'normal',
              textDecoration:
                pathname === '/transactions' ? 'underline' : 'none',
            }}
          >
            Transactions
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
} 