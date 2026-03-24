import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BudgetsModule } from './budgets/budgets.module';
import { CategoriesModule } from './categories/categories.module';
import { TransactionEventsModule } from './transaction-events/transaction-events.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  // Root infrastructure: load env config globally, then create TypeORM connection from DATABASE_URL.
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot({ global: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        // TODO: add strict env validation so app fails fast if DATABASE_URL is missing.
        url: configService.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    CategoriesModule,
    TransactionsModule,
    BudgetsModule,
    TransactionEventsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
