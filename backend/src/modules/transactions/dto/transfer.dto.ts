import { IsEmail, IsIn, IsString, Matches } from "class-validator";

export class TransferDto {
  @IsEmail()
  toEmail!: string;

  @IsIn(["USD", "EUR"])
  currency!: "USD" | "EUR";

  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: "amount must have max 2 decimals" })
  amount!: string;
}
