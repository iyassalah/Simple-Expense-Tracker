import { Module } from '@nestjs/common';
import { BudgetsModule } from '../budgets/budgets.module';
import { TransactionActivityListener } from './transaction-activity.listener';
import { TransactionBudgetListener } from './transaction-budget.listener';

@Module({
  imports: [BudgetsModule],
  providers: [TransactionActivityListener, TransactionBudgetListener],
})
export class TransactionEventsModule {}
