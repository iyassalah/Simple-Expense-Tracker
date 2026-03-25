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
  TextField,
} from '@mui/material';
import { useState } from 'react';
import { createCategory, type CreateCategoryPayload } from '@/lib/api/categories';
import { ApiError as ApiErrorClass } from '@/lib/api-client';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: CreateCategoryPayload) => createCategory(payload),
    onSuccess: async () => {
      setErrorMessage(null);
      setName('');
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
    mutate({ name: trimmed });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby={TITLE_ID}>
      <DialogTitle id={TITLE_ID}>Add category</DialogTitle>
      <DialogContent>
        <StacklessInput
          name={name}
          setName={setName}
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
  errorMessage,
}: {
  name: string;
  setName: (v: string) => void;
  errorMessage: string | null;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 0.5 }}>
      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
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

