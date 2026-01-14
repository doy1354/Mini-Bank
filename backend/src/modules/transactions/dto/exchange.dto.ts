import { IsIn, IsString, Matches } from 'class-validator';

export class ExchangeDto {
  @IsIn(['USD', 'EUR'])
  fromCurrency!: 'USD' | 'EUR';

  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'amount must have max 2 decimals' })
  amount!: string;
}


