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
  TextField,
  Select,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { startOfDay } from 'date-fns';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { AddCategoryDialog } from '@/app/components/AddCategoryDialog';
import {
  deleteTransaction,
  fetchTransaction,
  updateTransaction,
  type UpdateTransactionPayload,
} from '@/lib/api/transactions';
import { ApiError } from '@/lib/api-client';
import type { TransactionType } from '@/lib/types/api';

const TITLE_ID = 'transaction-detail-dialog-title';

function formatAmount(value: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ py: 0.5 }}>
      <Typography
        component="span"
        variant="body2"
        color="text.secondary"
        sx={{ minWidth: { sm: 140 }, flexShrink: 0 }}
      >
        {label}
      </Typography>
      <Typography component="span" variant="body2" sx={{ wordBreak: 'break-all' }}>
        {value}
      </Typography>
    </Stack>
  );
}

type TransactionDetailDialogProps = {
  open: boolean;
  transactionId: string | null;
  categoryNameById: Map<string, string>;
  onClose: () => void;
};

export function TransactionDetailDialog({
  open,
  transactionId,
  categoryNameById,
  onClose,
}: TransactionDetailDialogProps) {
  const queryClient = useQueryClient();

  const {
    data: tx,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: () => fetchTransaction(transactionId!),
    enabled: open && Boolean(transactionId),
  });

  const categoryOptions = useMemo(() => {
    return Array.from(categoryNameById.entries()).map(([id, name]) => ({
      id,
      name: name || 'Unknown category',
    }));
  }, [categoryNameById]);

  const [editMode, setEditMode] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);

  const [draftAmount, setDraftAmount] = useState<string>('');
  const [draftType, setDraftType] = useState<TransactionType>('expense');
  const [draftCategoryId, setDraftCategoryId] = useState<string>('');
  const [draftDate, setDraftDate] = useState<Date | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!editMode || !tx) return;
    setActionError(null);
    setDraftAmount(String(tx.amount));
    setDraftType(tx.type);
    setDraftCategoryId(tx.categoryId);
    setDraftDate(tx.date ? new Date(tx.date) : null);
  }, [editMode, tx]);

  const parsedDraftAmount = useMemo(() => {
    if (draftAmount.trim() === '') return NaN;
    return Number(draftAmount);
  }, [draftAmount]);

  const formValid = useMemo(() => {
    return (
      draftCategoryId.trim() !== '' &&
      draftDate != null &&
      !Number.isNaN(parsedDraftAmount) &&
      parsedDraftAmount > 0
    );
  }, [draftCategoryId, draftDate, parsedDraftAmount]);

  const {
    mutateAsync: updateAsync,
    isPending: updatePending,
  } = useMutation({
    mutationFn: (payload: UpdateTransactionPayload) =>
      updateTransaction(transactionId!, payload),
    onError: (err) => {
      setActionError(
        err instanceof ApiError
          ? err.statusCode === 404
            ? 'Transaction not found.'
            : `${err.message} (${err.statusCode})`
          : err instanceof Error
            ? err.message
            : 'Failed to update transaction',
      );
    },
    onSuccess: async () => {
      setEditMode(false);
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['transaction'], exact: false });
      // Budgets usage depends on transactions; refresh if budgets page is open.
      await queryClient.invalidateQueries({ queryKey: ['budgets'], exact: false });
      await queryClient.invalidateQueries({
        queryKey: ['budgetUsage'],
        exact: false,
      });
    },
  });

  const {
    mutateAsync: deleteAsync,
    isPending: deletePending,
  } = useMutation({
    mutationFn: () => deleteTransaction(transactionId!),
    onError: (err) => {
      setActionError(
        err instanceof ApiError
          ? err.statusCode === 404
            ? 'Transaction not found.'
            : `${err.message} (${err.statusCode})`
          : err instanceof Error
            ? err.message
            : 'Failed to delete transaction',
      );
    },
    onSuccess: async () => {
      setActionError(null);
      setDeleteConfirmOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['transaction'], exact: false });
      await queryClient.invalidateQueries({ queryKey: ['budgets'], exact: false });
      await queryClient.invalidateQueries({
        queryKey: ['budgetUsage'],
        exact: false,
      });
      onClose();
    },
  });

  const handleClose = () => {
    setEditMode(false);
    setDeleteConfirmOpen(false);
    setActionError(null);
    onClose();
  };

  const errorMessage =
    error instanceof ApiError
      ? error.statusCode === 404
        ? 'Transaction not found.'
        : `${error.message} (${error.statusCode})`
      : error instanceof Error
        ? error.message
        : 'Failed to load transaction';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby={TITLE_ID}
    >
      <DialogTitle id={TITLE_ID}>Transaction details</DialogTitle>
      <DialogContent dividers>
        {isPending && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress aria-label="Loading transaction" />
          </Box>
        )}

        {isError && !isPending && <Alert severity="error">{errorMessage}</Alert>}

        {tx && !isPending && !isError && !deleteConfirmOpen && !editMode && (
          <Stack spacing={0.5} sx={{ pt: 1 }}>
            <DetailRow label="Amount" value={formatAmount(tx.amount)} />
            <DetailRow label="Type" value={tx.type} />
            <DetailRow label="Date" value={new Date(tx.date).toLocaleString()} />
            <DetailRow
              label="Category"
              value={categoryNameById.get(tx.categoryId) ?? 'Unknown category'}
            />
            <DetailRow label="Created" value={new Date(tx.createdAt).toLocaleString()} />
            <DetailRow label="Updated" value={new Date(tx.updatedAt).toLocaleString()} />
          </Stack>
        )}

        {tx && !isPending && !isError && deleteConfirmOpen && (
          <Stack spacing={1} sx={{ pt: 1 }}>
            {actionError && <Alert severity="error">{actionError}</Alert>}
            <Typography variant="body1">
              Delete this transaction? This action cannot be undone.
            </Typography>
          </Stack>
        )}

        {tx && !isPending && !isError && editMode && (
          <Stack spacing={2} sx={{ pt: 1 }}>
            {actionError && <Alert severity="error">{actionError}</Alert>}

            <TextField
              label="Amount"
              value={draftAmount}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setDraftAmount(e.target.value)
              }
              type="number"
              inputProps={{ step: '0.01', min: 0 }}
              fullWidth
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <FormControl fullWidth>
                <InputLabel id="edit-tx-type-label">Type</InputLabel>
                <Select
                  labelId="edit-tx-type-label"
                  label="Type"
                  value={draftType}
                  onChange={(e) => setDraftType(e.target.value as TransactionType)}
                >
                  <MenuItem value="income">Income</MenuItem>
                  <MenuItem value="expense">Expense</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel id="edit-tx-category-label">Category</InputLabel>
                <Select
                  labelId="edit-tx-category-label"
                  label="Category"
                  value={draftCategoryId}
                  onChange={(e) => setDraftCategoryId(e.target.value)}
                >
                  {categoryOptions.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <DatePicker
              label="Date"
              value={draftDate}
              onChange={(d) => setDraftDate(d)}
              slotProps={{ textField: { fullWidth: true } }}
            />

            <Button variant="text" onClick={() => setAddCategoryOpen(true)}>
              Add category
            </Button>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {!editMode && !deleteConfirmOpen && (
          <>
            <Button
              onClick={() => {
                setActionError(null);
                setEditMode(true);
              }}
              variant="outlined"
            >
              Edit
            </Button>
            <Button
              onClick={() => {
                setActionError(null);
                setDeleteConfirmOpen(true);
              }}
              variant="outlined"
              color="error"
            >
              Delete
            </Button>
            <Button onClick={handleClose} variant="contained">
              Close
            </Button>
          </>
        )}

        {editMode && (
          <>
            <Button
              onClick={() => {
                setEditMode(false);
                setActionError(null);
              }}
              variant="outlined"
              disabled={updatePending}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!formValid) {
                  setActionError(
                    'Please select amount, category and date (amount must be > 0).',
                  );
                  return;
                }
                await updateAsync({
                  amount: parsedDraftAmount,
                  categoryId: draftCategoryId,
                  type: draftType,
                  date: draftDate ? startOfDay(draftDate).toISOString() : undefined,
                });
              }}
              variant="contained"
              disabled={updatePending || !formValid}
            >
              {updatePending ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={18} color="inherit" />
                  Saving...
                </Stack>
              ) : (
                'Save'
              )}
            </Button>
          </>
        )}

        {deleteConfirmOpen && (
          <>
            <Button
              onClick={() => {
                setDeleteConfirmOpen(false);
                setActionError(null);
              }}
              variant="outlined"
              disabled={deletePending}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                await deleteAsync();
              }}
              variant="contained"
              color="error"
              disabled={deletePending}
            >
              {deletePending ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={18} color="inherit" />
                  Deleting...
                </Stack>
              ) : (
                'Delete'
              )}
            </Button>
          </>
        )}
      </DialogActions>

      <AddCategoryDialog
        open={addCategoryOpen}
        onClose={() => setAddCategoryOpen(false)}
      />
    </Dialog>
  );
}
