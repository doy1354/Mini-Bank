export type LedgerEntryDto = {
  id: string;
  accountId: string;
  currency: string;
  amountCents: string;
  createdAt: string;
};

export type TransactionDetailDto = {
  id: string;
  type: 'transfer' | 'exchange';
  createdAt: string;
  fromUserId: string;
  toUserId: string;
  currency: string | null;
  amountCents: string | null;
  srcCurrency: string | null;
  dstCurrency: string | null;
  srcAmountCents: string | null;
  dstAmountCents: string | null;
  rateNumerator: number | null;
  rateDenominator: number | null;
  ledgerEntries: LedgerEntryDto[];
};



