'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { endOfDay, startOfDay } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import {
  createBudget,
  deleteBudget,
  fetchBudget,
  fetchBudgetUsage,
  fetchBudgets,
  updateBudget,
} from '@/lib/api/budgets';
import { fetchCategories } from '@/lib/api/categories';
import { ApiError } from '@/lib/api-client';
import type {
  Budget,
  CreateBudgetPayload,
  GetBudgetsQueryParams,
  UpdateBudgetPayload,
} from '@/lib/types/api';
import { AddCategoryDialog } from '@/app/components/AddCategoryDialog';

function formatMoney(value: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

function getApiErrorMessage(err: unknown): string {
  return err instanceof ApiError
    ? err.statusCode === 404
      ? 'Not found.'
      : `${err.message} (${err.statusCode})`
    : err instanceof Error
      ? err.message
      : 'Request failed';
}

export default function BudgetsPage() {
  const queryClient = useQueryClient();

  const [filterCategoryId, setFilterCategoryId] = useState<string>('');
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);

  const [usageFromDate, setUsageFromDate] = useState<Date | null>(null);
  const [usageToDate, setUsageToDate] = useState<Date | null>(null);

  const usageFromIso = useMemo(
    () => (usageFromDate ? startOfDay(usageFromDate).toISOString() : undefined),
    [usageFromDate],
  );
  const usageToIso = useMemo(
    () => (usageToDate ? endOfDay(usageToDate).toISOString() : undefined),
    [usageToDate],
  );

  const {
    data: categories = [],
    isPending: categoriesLoading,
    isError: categoriesIsError,
    error: categoriesError,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const categoryNameByIdMemo = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories) m.set(c.id, c.name);
    return m;
  }, [categories]);

  const budgetsQueryParams = useMemo<GetBudgetsQueryParams>(
    () => (filterCategoryId ? { categoryId: filterCategoryId } : {}),
    [filterCategoryId],
  );

  const {
    data: budgets = [],
    isPending: budgetsLoading,
    isError: budgetsIsError,
    error: budgetsError,
  } = useQuery({
    queryKey: ['budgets', budgetsQueryParams],
    queryFn: () => fetchBudgets(budgetsQueryParams),
  });

  useEffect(() => {
    if (!budgetsLoading && budgets.length > 0) {
      if (!selectedBudgetId || !budgets.some((b) => b.id === selectedBudgetId)) {
        setSelectedBudgetId(budgets[0].id);
      }
    }
  }, [budgets, budgetsLoading, selectedBudgetId]);

  const {
    data: usage,
    isPending: usageLoading,
    isError: usageIsError,
    error: usageError,
  } = useQuery({
    queryKey: ['budgetUsage', selectedBudgetId, usageFromIso, usageToIso],
    queryFn: () =>
      selectedBudgetId
        ? fetchBudgetUsage(selectedBudgetId, {
            from: usageFromIso,
            to: usageToIso,
          })
        : Promise.reject(new Error('No budget selected')),
    enabled: Boolean(selectedBudgetId),
  });

  const {
    data: selectedBudget,
    isPending: selectedBudgetLoading,
    isError: selectedBudgetIsError,
    error: selectedBudgetError,
  } = useQuery({
    queryKey: ['budget', selectedBudgetId],
    queryFn: () => fetchBudget(selectedBudgetId!),
    enabled: Boolean(selectedBudgetId),
  });

  const usagePercent = usage?.percentUsed;
  const showUsageProgress =
    usagePercent != null && Number.isFinite(usagePercent);

  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [budgetDialogMode, setBudgetDialogMode] = useState<'create' | 'edit'>(
    'create',
  );
  const [budgetDialogEditingId, setBudgetDialogEditingId] = useState<string | null>(null);
  const [budgetDialogError, setBudgetDialogError] = useState<string | null>(null);

  const [draftCategoryId, setDraftCategoryId] = useState<string>('');
  const [draftCapAmount, setDraftCapAmount] = useState<string>('0');
  const [draftPeriodStart, setDraftPeriodStart] = useState<Date | null>(
    new Date(),
  );
  const [draftPeriodEnd, setDraftPeriodEnd] = useState<Date | null>(
    new Date(),
  );

  const [addCategoryOpen, setAddCategoryOpen] = useState(false);

  const saveBudgetMutation = useMutation({
    mutationFn: async (input: {
      mode: 'create' | 'edit';
      id?: string;
      payload: CreateBudgetPayload | UpdateBudgetPayload;
    }) => {
      if (input.mode === 'create') {
        return createBudget(input.payload as CreateBudgetPayload);
      }
      return updateBudget(input.id!, input.payload as UpdateBudgetPayload);
    },
    onSuccess: async () => {
      setBudgetDialogOpen(false);
      setBudgetDialogError(null);
      await queryClient.invalidateQueries({ queryKey: ['budgets'], exact: false });
      await queryClient.invalidateQueries({ queryKey: ['budgetUsage'], exact: false });
    },
    onError: (err) => {
      setBudgetDialogError(getApiErrorMessage(err));
    },
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: (id: string) => deleteBudget(id),
    onSuccess: async (_, id) => {
      await queryClient.invalidateQueries({ queryKey: ['budgets'], exact: false });
      await queryClient.invalidateQueries({ queryKey: ['budgetUsage'], exact: false });
      setSelectedBudgetId((prev) => (prev === id ? null : prev));
    },
    onError: (err) => {
      setBudgetDialogError(getApiErrorMessage(err));
    },
  });

  const openCreateBudget = () => {
    setBudgetDialogMode('create');
    setBudgetDialogEditingId(null);
    setBudgetDialogError(null);
    setDraftCategoryId('');
    setDraftCapAmount('0');
    setDraftPeriodStart(new Date());
    setDraftPeriodEnd(new Date());
    setBudgetDialogOpen(true);
  };

  const openEditBudget = (b: Budget) => {
    setBudgetDialogMode('edit');
    setBudgetDialogEditingId(b.id);
    setBudgetDialogError(null);
    setDraftCategoryId(b.categoryId);
    setDraftCapAmount(String(b.capAmount));
    setDraftPeriodStart(b.periodStart ? new Date(b.periodStart) : null);
    setDraftPeriodEnd(b.periodEnd ? new Date(b.periodEnd) : null);
    setBudgetDialogOpen(true);
  };

  const capAmountNumber = useMemo(() => {
    const n = Number(draftCapAmount);
    return Number.isFinite(n) ? n : NaN;
  }, [draftCapAmount]);

  const budgetConflict = useMemo(() => {
    if (!budgetDialogOpen) return null;
    if (!draftCategoryId || !draftPeriodStart || !draftPeriodEnd) return null;

    const requestedStart = startOfDay(draftPeriodStart).getTime();
    const requestedEnd = endOfDay(draftPeriodEnd).getTime();

    // Defensive: if user picks an invalid range, let the backend/validation handle it.
    if (requestedEnd < requestedStart) return null;

    return (
      budgets.find((b) => {
        if (budgetDialogMode === 'edit' && budgetDialogEditingId && b.id === budgetDialogEditingId) {
          return false;
        }
        if (b.categoryId !== draftCategoryId) return false;

        const existingStart = new Date(b.periodStart).getTime();
        const existingEnd = new Date(b.periodEnd).getTime();

        // Inclusive overlap: existingStart <= requestedEnd && existingEnd >= requestedStart
        return existingStart <= requestedEnd && existingEnd >= requestedStart;
      }) ?? null
    );
  }, [
    budgetDialogOpen,
    budgets,
    budgetDialogMode,
    budgetDialogEditingId,
    draftCategoryId,
    draftPeriodStart,
    draftPeriodEnd,
  ]);

  const budgetFormValid = useMemo(() => {
    return (
      draftCategoryId.trim() !== '' &&
      !Number.isNaN(capAmountNumber) &&
      capAmountNumber >= 0 &&
      draftPeriodStart != null &&
      draftPeriodEnd != null &&
      budgetConflict == null
    );
  }, [draftCategoryId, capAmountNumber, draftPeriodStart, draftPeriodEnd, budgetConflict]);

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Typography variant="h4">Budgets</Typography>
        <Button variant="contained" onClick={openCreateBudget}>
          Create budget
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel id="budget-filter-category-label">Category</InputLabel>
          <Select
            labelId="budget-filter-category-label"
            label="Category"
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
          >
            <MenuItem value="">All categories</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {(categoriesIsError || budgetsIsError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(categoriesIsError && categoriesError instanceof Error
            ? categoriesError.message
            : null) ??
            (budgetsIsError && budgetsError instanceof Error
              ? budgetsError.message
              : 'Failed to load budgets')}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
        <Box sx={{ flex: 1 }}>
          {budgetsLoading ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={18} />
              <Typography variant="body2">Loading budgets...</Typography>
            </Stack>
          ) : budgets.length === 0 ? (
            <Typography color="text.secondary">No budgets yet.</Typography>
          ) : (
            <Stack spacing={1}>
              {budgets.map((b) => {
                const categoryName =
                  categoryNameByIdMemo.get(b.categoryId) ?? 'Unknown category';
                const selected = b.id === selectedBudgetId;
                return (
                  <Paper
                    key={b.id}
                    variant="outlined"
                    onClick={() => setSelectedBudgetId(b.id)}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      borderColor: selected ? 'primary.main' : 'divider',
                      borderWidth: 1,
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" spacing={1}>
                      <Box>
                        <Typography fontWeight="bold">
                          {categoryName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Cap: {formatMoney(b.capAmount)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Period: {new Date(b.periodStart).toLocaleDateString()} -{' '}
                          {new Date(b.periodEnd).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditBudget(b);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteBudgetMutation.mutate(b.id);
                          }}
                          disabled={deleteBudgetMutation.isPending}
                        >
                          Delete
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Box>

        <Box sx={{ flex: 1 }}>
          {!selectedBudgetId ? (
            <Typography color="text.secondary">Select a budget to see usage.</Typography>
          ) : usageLoading ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={18} />
              <Typography variant="body2">Loading usage...</Typography>
            </Stack>
          ) : usageIsError ? (
            <Alert severity="error">
              {usageError instanceof Error ? usageError.message : 'Failed to load usage'}
            </Alert>
          ) : usage ? (
            <Stack spacing={2}>
              <Typography variant="h6">Usage</Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <DatePicker
                  label="From"
                  value={usageFromDate}
                  onChange={(d) => setUsageFromDate(d)}
                  slotProps={{ textField: { size: 'small', sx: { minWidth: 160 } } }}
                />
                <DatePicker
                  label="To"
                  value={usageToDate}
                  onChange={(d) => setUsageToDate(d)}
                  slotProps={{ textField: { size: 'small', sx: { minWidth: 160 } } }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setUsageFromDate(null);
                    setUsageToDate(null);
                  }}
                >
                  Reset
                </Button>
              </Stack>

              {showUsageProgress ? (
                <Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.max(0, Math.min(100, usagePercent ?? 0))}
                  />
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {usage.percentUsed != null ? `${usage.percentUsed.toFixed(1)}% used` : ''}
                  </Typography>
                </Box>
              ) : (
                <Alert severity="info">
                  Percent usage is not available for a cap of 0.
                </Alert>
              )}

              <Stack spacing={0.5}>
                <Typography variant="body2">
                  Spent: <b>{formatMoney(usage.spent)}</b>
                </Typography>
                <Typography variant="body2">
                  Remaining: <b>{formatMoney(usage.remaining)}</b>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Effective range: {new Date(usage.effectiveFrom).toLocaleDateString()} -{' '}
                  {new Date(usage.effectiveTo).toLocaleDateString()}
                </Typography>
                {!selectedBudgetLoading && selectedBudget && (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      Budget created: {new Date(selectedBudget.createdAt).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Budget updated: {new Date(selectedBudget.updatedAt).toLocaleString()}
                    </Typography>
                  </>
                )}
                {selectedBudgetIsError && (
                  <Alert severity="info">
                    Budget metadata could not be loaded.{' '}
                    {selectedBudgetError instanceof Error
                      ? selectedBudgetError.message
                      : ''}
                  </Alert>
                )}
              </Stack>
            </Stack>
          ) : null}
        </Box>
      </Stack>

      <Dialog
        open={budgetDialogOpen}
        onClose={() => setBudgetDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{budgetDialogMode === 'create' ? 'Create budget' : 'Edit budget'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {budgetDialogError && <Alert severity="error">{budgetDialogError}</Alert>}
            {budgetConflict && (
              <Alert severity="warning">
                This budget conflicts with an existing budget for the same category (
                {new Date(budgetConflict.periodStart).toLocaleDateString()} -{' '}
                {new Date(budgetConflict.periodEnd).toLocaleDateString()}
                ). Choose a different period or edit the existing budget.
              </Alert>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <FormControl fullWidth>
                <InputLabel id="budget-dialog-category-label">Category</InputLabel>
                <Select
                  labelId="budget-dialog-category-label"
                  label="Category"
                  value={draftCategoryId}
                  onChange={(e) => setDraftCategoryId(e.target.value)}
                >
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="text"
                onClick={() => setAddCategoryOpen(true)}
                disabled={categoriesLoading}
                sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, whiteSpace: 'nowrap' }}
              >
                Add category
              </Button>
            </Stack>

            <TextField
              label="Cap amount"
              value={draftCapAmount}
              onChange={(e) => setDraftCapAmount(e.target.value)}
              type="number"
              inputProps={{ step: '0.01', min: 0 }}
              fullWidth
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <DatePicker
                label="Period start"
                value={draftPeriodStart}
                onChange={(d) => setDraftPeriodStart(d)}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <DatePicker
                label="Period end"
                value={draftPeriodEnd}
                onChange={(d) => setDraftPeriodEnd(d)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBudgetDialogOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!budgetFormValid || saveBudgetMutation.isPending}
            onClick={() => {
              setBudgetDialogError(null);
              if (!draftPeriodStart || !draftPeriodEnd) return;
              const payload =
                budgetDialogMode === 'create'
                  ? ({
                      categoryId: draftCategoryId,
                      capAmount: capAmountNumber,
                      periodStart: startOfDay(draftPeriodStart).toISOString(),
                      periodEnd: endOfDay(draftPeriodEnd).toISOString(),
                    } satisfies CreateBudgetPayload)
                  : ({
                      categoryId: draftCategoryId,
                      capAmount: capAmountNumber,
                      periodStart: startOfDay(draftPeriodStart).toISOString(),
                      periodEnd: endOfDay(draftPeriodEnd).toISOString(),
                    } satisfies UpdateBudgetPayload);

              saveBudgetMutation.mutate({
                mode: budgetDialogMode,
                id: budgetDialogEditingId ?? undefined,
                payload,
              });
            }}
          >
            {saveBudgetMutation.isPending ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={18} color="inherit" />
                Saving...
              </Stack>
            ) : budgetDialogMode === 'create' ? (
              'Create'
            ) : (
              'Save'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <AddCategoryDialog
        open={addCategoryOpen}
        onClose={() => setAddCategoryOpen(false)}
      />
    </Box>
  );
}

