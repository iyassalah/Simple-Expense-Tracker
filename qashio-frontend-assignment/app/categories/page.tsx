'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Stack,
  Typography,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridSortModel } from '@mui/x-data-grid';
import { useMemo, useState } from 'react';
import { fetchCategories } from '@/lib/api/categories';
import { ApiError } from '@/lib/api-client';
import { AddCategoryDialog } from '@/app/components/AddCategoryDialog';
import type { Category } from '@/lib/types/api';

function getApiErrorMessage(err: unknown): string {
  return err instanceof ApiError
    ? `${err.message} (${err.statusCode})`
    : err instanceof Error
      ? err.message
      : 'Failed to load categories';
}

export default function CategoriesPage() {
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);

  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: 'name', sort: 'asc' },
  ]);

  const {
    data: categories = [],
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const columns: GridColDef<Category>[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Name',
        flex: 1,
        minWidth: 220,
      },
      {
        field: 'kind',
        headerName: 'Kind',
        width: 120,
        valueFormatter: (value: string) =>
          value === 'income' ? 'Income' : value === 'expense' ? 'Expense' : value,
      },
      {
        field: 'createdAt',
        headerName: 'Created',
        minWidth: 200,
        flex: 1,
        valueFormatter: (value: string) =>
          value ? new Date(value).toLocaleString() : '',
      },
      {
        field: 'updatedAt',
        headerName: 'Updated',
        minWidth: 200,
        flex: 1,
        valueFormatter: (value: string) =>
          value ? new Date(value).toLocaleString() : '',
      },
    ],
    [],
  );

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Typography variant="h4">Categories</Typography>
        <Button variant="contained" onClick={() => setAddCategoryOpen(true)}>
          Add category
        </Button>
      </Stack>

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {getApiErrorMessage(error)}
        </Alert>
      )}

      {!isPending && !isError && categories.length === 0 && (
        <Typography color="text.secondary">No categories yet.</Typography>
      )}

      {!isError && (
        <Box sx={{ width: '100%', minHeight: 420 }}>
          <DataGrid
            rows={categories}
            columns={columns}
            getRowId={(row) => row.id}
            loading={isPending}
            sortModel={sortModel}
            onSortModelChange={(m) => setSortModel(m)}
            disableRowSelectionOnClick
            disableColumnFilter
            disableColumnMenu
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              '& .MuiDataGrid-columnHeaders': {
                bgcolor: 'action.hover',
              },
              '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
                outline: 'none',
              },
              '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within':
                {
                  outline: 'none',
                },
            }}
          />
        </Box>
      )}

      <AddCategoryDialog
        open={addCategoryOpen}
        onClose={() => setAddCategoryOpen(false)}
      />
    </Box>
  );
}

