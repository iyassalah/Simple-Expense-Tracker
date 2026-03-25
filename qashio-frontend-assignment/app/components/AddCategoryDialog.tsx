'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import { useState } from 'react';
import { createCategory, type CreateCategoryPayload } from '@/lib/api/categories';
import { ApiError as ApiErrorClass } from '@/lib/api-client';
import type { CategoryKind } from '@/lib/types/api';

const TITLE_ID = 'add-category-dialog-title';

function getApiErrorMessage(err: unknown): string {
  return err instanceof ApiErrorClass
    ? `${err.message} (${err.statusCode})`
    : err instanceof Error
      ? err.message
      : 'Failed to create category';
}

export function AddCategoryDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<CategoryKind>('expense');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: CreateCategoryPayload) => createCategory(payload),
    onSuccess: async () => {
      setErrorMessage(null);
      setName('');
      setKind('expense');
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      onClose();
    },
    onError: (err) => {
      setErrorMessage(getApiErrorMessage(err));
    },
  });

  const handleSubmit = () => {
    setErrorMessage(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMessage('Category name is required.');
      return;
    }
    mutate({ name: trimmed, kind });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby={TITLE_ID}>
      <DialogTitle id={TITLE_ID}>Add category</DialogTitle>
      <DialogContent>
        <StacklessInput
          name={name}
          setName={setName}
          kind={kind}
          setKind={setKind}
          errorMessage={errorMessage}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isPending} variant="outlined">
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isPending} variant="contained">
          {isPending ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={18} color="inherit" />
              <span>Creating...</span>
            </Box>
          ) : (
            'Create'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function StacklessInput({
  name,
  setName,
  kind,
  setKind,
  errorMessage,
}: {
  name: string;
  setName: (v: string) => void;
  kind: CategoryKind;
  setKind: (v: CategoryKind) => void;
  errorMessage: string | null;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 0.5 }}>
      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
      <FormControl fullWidth>
        <InputLabel id="add-category-kind-label">Kind</InputLabel>
        <Select
          labelId="add-category-kind-label"
          label="Kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as CategoryKind)}
        >
          <MenuItem value="expense">Expense</MenuItem>
          <MenuItem value="income">Income</MenuItem>
        </Select>
      </FormControl>
      <TextField
        autoFocus
        label="Category name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
      />
    </Box>
  );
}

