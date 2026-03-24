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
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';
import { BudgetUsageResponseDto } from './dto/budget-usage-response.dto';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { GetBudgetUsageQueryDto } from './dto/get-budget-usage-query.dto';
import { GetBudgetsQueryDto } from './dto/get-budgets-query.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { Budget } from './entities/budget.entity';

@ApiTags('budgets')
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @ApiCreatedResponse({ type: Budget })
  create(@Body() dto: CreateBudgetDto): Promise<Budget> {
    return this.budgetsService.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: [Budget] })
  findAll(@Query() query: GetBudgetsQueryDto): Promise<Budget[]> {
    return this.budgetsService.findAll(query);
  }

  @Get(':id/usage')
  @ApiOkResponse({ type: BudgetUsageResponseDto })
  getUsage(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: GetBudgetUsageQueryDto,
  ): Promise<BudgetUsageResponseDto> {
    return this.budgetsService.getUsage(id, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: Budget })
  findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<Budget> {
    return this.budgetsService.findOne(id);
  }

  @Put(':id')
  @ApiOkResponse({ type: Budget })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateBudgetDto,
  ): Promise<Budget> {
    return this.budgetsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.budgetsService.remove(id);
  }
}
