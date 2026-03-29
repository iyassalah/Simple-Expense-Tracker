import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BudgetsService } from './budgets.service';
import { BudgetUsageResponseDto } from './dto/budget-usage-response.dto';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { GetBudgetUsageQueryDto } from './dto/get-budget-usage-query.dto';
import { GetBudgetsQueryDto } from './dto/get-budgets-query.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { Budget } from './entities/budget.entity';

@ApiTags('budgets')
@ApiBearerAuth('access-token')
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @ApiCreatedResponse({ type: Budget })
  create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateBudgetDto,
  ): Promise<Budget> {
    return this.budgetsService.create(dto, userId);
  }

  @Get()
  @ApiOkResponse({ type: [Budget] })
  findAll(
    @CurrentUser('sub') userId: string,
    @Query() query: GetBudgetsQueryDto,
  ): Promise<Budget[]> {
    return this.budgetsService.findAll(userId, query);
  }

  @Get(':id/usage')
  @ApiOkResponse({ type: BudgetUsageResponseDto })
  getUsage(
    @CurrentUser('sub') userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: GetBudgetUsageQueryDto,
  ): Promise<BudgetUsageResponseDto> {
    return this.budgetsService.getUsage(id, query, userId);
  }

  @Get(':id')
  @ApiOkResponse({ type: Budget })
  findOne(
    @CurrentUser('sub') userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<Budget> {
    return this.budgetsService.findOne(id, userId);
  }

  @Put(':id')
  @ApiOkResponse({ type: Budget })
  update(
    @CurrentUser('sub') userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateBudgetDto,
  ): Promise<Budget> {
    return this.budgetsService.update(id, dto, userId);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  async remove(
    @CurrentUser('sub') userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.budgetsService.remove(id, userId);
  }
}
