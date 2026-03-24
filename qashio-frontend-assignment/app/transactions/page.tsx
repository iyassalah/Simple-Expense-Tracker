'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
  type GridSortModel,
} from '@mui/x-data-grid';
import { endOfDay, startOfDay } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { fetchCategories } from '@/lib/api/categories';
import {
  fetchTransactions,
  TRANSACTIONS_PAGE_LIMIT,
} from '@/lib/api/transactions';
import { ApiError } from '@/lib/api-client';
import type {
  SortOrder,
  Transaction,
  TransactionSortBy,
  TransactionType,
} from '@/lib/types/api';

const SORT_FIELDS: TransactionSortBy[] = [
  'date',
  'amount',
  'type',
  'createdAt',
];

function isSortField(f: string): f is TransactionSortBy {
  return (SORT_FIELDS as string[]).includes(f);
}

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<TransactionSortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  const fromIso = useMemo(
    () => (fromDate ? startOfDay(fromDate).toISOString() : undefined),
    [fromDate],
  );
  const toIso = useMemo(
    () => (toDate ? endOfDay(toDate).toISOString() : undefined),
    [toDate],
  );

  const listParams = useMemo(
    () => ({
      page,
      limit: TRANSACTIONS_PAGE_LIMIT,
      sortBy,
      sortOrder,
      ...(filterType !== 'all' ? { type: filterType } : {}),
      ...(filterCategoryId ? { categoryId: filterCategoryId } : {}),
      ...(fromIso ? { from: fromIso } : {}),
      ...(toIso ? { to: toIso } : {}),
    }),
    [
      page,
      sortBy,
      sortOrder,
      filterType,
      filterCategoryId,
      fromIso,
      toIso,
    ],
  );

  const {
    data: categories = [],
    isPending: categoriesLoading,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories) {
      m.set(c.id, c.name);
    }
    return m;
  }, [categories]);

  const {
    data: listData,
    isPending: listLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['transactions', listParams],
    queryFn: () => fetchTransactions(listParams),
  });

  const rows = listData?.data ?? [];
  const total = listData?.total ?? 0;

  const sortModel: GridSortModel = useMemo(
    () => [{ field: sortBy, sort: sortOrder === 'ASC' ? 'asc' : 'desc' }],
    [sortBy, sortOrder],
  );

  const paginationModel: GridPaginationModel = useMemo(
    () => ({ page: page - 1, pageSize: TRANSACTIONS_PAGE_LIMIT }),
    [page],
  );

  const handleSortModelChange = useCallback((model: GridSortModel) => {
    const first = model[0];
    if (!first || !first.sort) {
      setSortBy('date');
      setSortOrder('DESC');
      return;
    }
    if (!isSortField(first.field)) {
      return;
    }
    setSortBy(first.field);
    setSortOrder(first.sort === 'asc' ? 'ASC' : 'DESC');
  }, []);

  const handlePaginationModelChange = useCallback(
    (model: GridPaginationModel) => {
      setPage(model.page + 1);
    },
    [],
  );

  const resetPage = useCallback(() => {
    setPage(1);
  }, []);

  const columns: GridColDef<Transaction>[] = useMemo(
    () => [
      {
        field: 'date',
        headerName: 'Date',
        flex: 1,
        minWidth: 180,
        valueFormatter: (value: string) =>
          value ? new Date(value).toLocaleString() : '',
      },
      {
        field: 'amount',
        headerName: 'Amount',
        width: 130,
        type: 'number',
        valueFormatter: (value: number) =>
          new Intl.NumberFormat(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          }).format(value),
      },
      {
        field: 'type',
        headerName: 'Type',
        width: 110,
      },
      {
        field: 'category',
        headerName: 'Category',
        sortable: false,
        flex: 1,
        minWidth: 160,
        valueGetter: (_value, row) =>
          categoryNameById.get(row.categoryId) ?? row.categoryId,
      },
    ],
    [categoryNameById],
  );

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Transactions
      </Typography>

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof ApiError
            ? `${error.message} (${error.statusCode})`
            : error instanceof Error
              ? error.message
              : 'Failed to load transactions'}
        </Alert>
      )}

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ mb: 2 }}
        flexWrap="wrap"
        useFlexGap
      >
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="filter-type-label">Type</InputLabel>
          <Select
            labelId="filter-type-label"
            label="Type"
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value as 'all' | TransactionType);
              resetPage();
            }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="income">Income</MenuItem>
            <MenuItem value="expense">Expense</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="filter-category-label">Category</InputLabel>
          <Select
            labelId="filter-category-label"
            label="Category"
            value={filterCategoryId}
            disabled={categoriesLoading}
            onChange={(e) => {
              setFilterCategoryId(e.target.value);
              resetPage();
            }}
          >
            <MenuItem value="">All categories</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <DatePicker
          label="From"
          value={fromDate}
          onChange={(d) => {
            setFromDate(d);
            resetPage();
          }}
          slotProps={{ textField: { size: 'small', sx: { minWidth: 160 } } }}
        />
        <DatePicker
          label="To"
          value={toDate}
          onChange={(d) => {
            setToDate(d);
            resetPage();
          }}
          slotProps={{ textField: { size: 'small', sx: { minWidth: 160 } } }}
        />
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            setFromDate(null);
            setToDate(null);
            resetPage();
          }}
          sx={{ alignSelf: { xs: 'stretch', md: 'center' } }}
        >
          Clear dates
        </Button>
      </Stack>

      {!isError && !listLoading && total === 0 && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          No transactions found.
        </Typography>
      )}

      {!isError && (
        <Box sx={{ width: '100%', minHeight: 420 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => row.id}
            loading={listLoading}
            paginationMode="server"
            sortingMode="server"
            sortModel={sortModel}
            onSortModelChange={handleSortModelChange}
            rowCount={total}
            paginationModel={paginationModel}
            onPaginationModelChange={handlePaginationModelChange}
            pageSizeOptions={[TRANSACTIONS_PAGE_LIMIT]}
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
            }}
          />
        </Box>
      )}
    </Box>
  );
}
