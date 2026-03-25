'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { startOfDay } from 'date-fns';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchCategories } from '@/lib/api/categories';
import { AddCategoryDialog } from '@/app/components/AddCategoryDialog';
import {
  createTransaction,
  type CreateTransactionPayload,
} from '@/lib/api/transactions';
import { ApiError } from '@/lib/api-client';
import type { CategoryKind, TransactionType } from '@/lib/types/api';

function getApiErrorMessage(err: unknown): string {
  return err instanceof ApiError
    ? err.statusCode === 404
      ? 'Resource not found.'
      : `${err.message} (${err.statusCode})`
    : err instanceof Error
      ? err.message
      : 'Failed to submit transaction';
}

export default function NewTransactionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState<string>('');
  const [type, setType] = useState<TransactionType>('expense');
  const [categoryId, setCategoryId] = useState<string>('');
  const [date, setDate] = useState<Date | null>(new Date());

  const [formError, setFormError] = useState<string | null>(null);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);

  const parsedAmount = useMemo(() => {
    if (amount.trim() === '') return NaN;
    return Number(amount);
  }, [amount]);

  const formValid = useMemo(() => {
    return (
      categoryId.trim() !== '' &&
      date != null &&
      !Number.isNaN(parsedAmount) &&
      parsedAmount > 0
    );
  }, [categoryId, date, parsedAmount]);

  const {
    data: categories = [],
    isPending: categoriesLoading,
    error: categoriesError,
    isError: categoriesIsError,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const eligibleCategories = useMemo(() => {
    const requiredKind: CategoryKind = type === 'income' ? 'income' : 'expense';
    return categories.filter((c) => c.kind === requiredKind);
  }, [categories, type]);

  const {
    mutate: submit,
    isPending: submitPending,
  } = useMutation({
    mutationFn: (payload: CreateTransactionPayload) =>
      createTransaction(payload),
    onSuccess: async () => {
      setApiErrorMessage(null);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      router.push('/transactions');
    },
    onError: (err) => {
      setApiErrorMessage(getApiErrorMessage(err));
    },
  });

  const handleSubmit = () => {
    setFormError(null);
    setApiErrorMessage(null);

    if (!formValid) {
      setFormError(
        'Please fill out amount, category, type, and date (amount must be > 0).',
      );
      return;
    }

    if (!date) return;

    submit({
      amount: parsedAmount,
      categoryId,
      date: startOfDay(date).toISOString(),
      type,
    });
  };

  const categoriesErrorMessage =
    categoriesIsError && categoriesError instanceof Error
      ? categoriesError.message
      : categoriesIsError
        ? 'Failed to load categories'
        : null;

  const displayedErrorMessage = apiErrorMessage ?? null;

  return (
    <>
      <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>
        New Transaction
      </Typography>

      <Stack spacing={2}>
        {(formError || displayedErrorMessage || categoriesErrorMessage) && (
          <Alert severity="error">
            {formError ?? displayedErrorMessage ?? categoriesErrorMessage}
          </Alert>
        )}

        {categoriesLoading && (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ color: 'text.secondary' }}
          >
            <CircularProgress size={18} />
            <Typography variant="body2">Loading categories...</Typography>
          </Stack>
        )}

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            inputProps={{ step: '0.01', min: 0 }}
            fullWidth
          />

          <FormControl fullWidth>
            <InputLabel id="new-tx-type-label">Type</InputLabel>
            <Select
              labelId="new-tx-type-label"
              label="Type"
              value={type}
              onChange={(e) => {
                const nextType = e.target.value as TransactionType;
                setType(nextType);
                // Clear any currently selected category that no longer matches the type.
                const requiredKind: CategoryKind =
                  nextType === 'income' ? 'income' : 'expense';
                const stillValid = categories.some(
                  (c) => c.id === categoryId && c.kind === requiredKind,
                );
                if (!stillValid) {
                  setCategoryId('');
                }
              }}
            >
              <MenuItem value="income">Income</MenuItem>
              <MenuItem value="expense">Expense</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <FormControl fullWidth disabled={categoriesLoading}>
            <InputLabel id="new-tx-category-label">Category</InputLabel>
            <Select
              labelId="new-tx-category-label"
              label="Category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {eligibleCategories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="text"
            disabled={categoriesLoading}
            onClick={() => setAddCategoryOpen(true)}
            sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, whiteSpace: 'nowrap' }}
          >
            Add category
          </Button>
        </Stack>

        <DatePicker
          label="Date"
          value={date}
          onChange={(d) => setDate(d)}
          slotProps={{ textField: { fullWidth: true } }}
        />

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button
            variant="outlined"
            disabled={submitPending}
            onClick={() => router.push('/transactions')}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!formValid || categoriesLoading || submitPending}
            onClick={handleSubmit}
          >
            {submitPending ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={18} color="inherit" />
                <span>Creating...</span>
              </Stack>
            ) : (
              'Create transaction'
            )}
          </Button>
        </Stack>
      </Stack>
      </Box>

      <AddCategoryDialog
        open={addCategoryOpen}
        onClose={() => setAddCategoryOpen(false)}
      />
    </>
  );
}


