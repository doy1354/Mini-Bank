import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { TransactionsService } from './transactions.service';
import { TransferDto } from './dto/transfer.dto';
import { ExchangeDto } from './dto/exchange.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';

@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly tx: TransactionsService) {}

  @Post('transfer')
  async transfer(@CurrentUser() user: RequestUser, @Body() dto: TransferDto) {
    return this.tx.transfer(user.userId, dto);
  }

  @Post('exchange')
  async exchange(@CurrentUser() user: RequestUser, @Body() dto: ExchangeDto) {
    return this.tx.exchange(user.userId, dto);
  }

  @Get()
  async list(@CurrentUser() user: RequestUser, @Query() q: ListTransactionsDto) {
    return this.tx.list(user.userId, q);
  }

  @Get(':id')
  async detail(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.tx.getDetail(user.userId, id);
  }
}


