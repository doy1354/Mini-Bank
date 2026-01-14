CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency text NOT NULL CHECK (currency IN ('USD','EUR')),
  balance_cents bigint NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, currency)
);

CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('transfer','exchange')),

  from_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  to_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  currency text NULL CHECK (currency IN ('USD','EUR')),
  amount_cents bigint NULL CHECK (amount_cents > 0),
  from_account_id uuid NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  to_account_id uuid NULL REFERENCES accounts(id) ON DELETE RESTRICT,

  src_currency text NULL CHECK (src_currency IN ('USD','EUR')),
  dst_currency text NULL CHECK (dst_currency IN ('USD','EUR')),
  src_amount_cents bigint NULL CHECK (src_amount_cents > 0),
  dst_amount_cents bigint NULL CHECK (dst_amount_cents > 0),
  rate_numerator integer NULL CHECK (rate_numerator > 0),
  rate_denominator integer NULL CHECK (rate_denominator > 0),

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_from_user ON transactions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_user ON transactions(to_user_id);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  currency text NOT NULL CHECK (currency IN ('USD','EUR')),
  amount_cents bigint NOT NULL CHECK (amount_cents <> 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_tx ON ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account_created ON ledger_entries(account_id, created_at DESC);

CREATE OR REPLACE FUNCTION touch_account_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_accounts_touch ON accounts;
CREATE TRIGGER trg_accounts_touch
BEFORE UPDATE ON accounts
FOR EACH ROW
EXECUTE FUNCTION touch_account_updated_at();

CREATE OR REPLACE FUNCTION apply_ledger_entry_to_balance()
RETURNS trigger AS $$
DECLARE
  new_balance bigint;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE accounts
      SET balance_cents = balance_cents + NEW.amount_cents
      WHERE id = NEW.account_id
      RETURNING balance_cents INTO new_balance;

    IF new_balance IS NULL THEN
      RAISE EXCEPTION 'Account % not found', NEW.account_id;
    END IF;

    IF new_balance < 0 THEN
      RAISE EXCEPTION 'Insufficient funds';
    END IF;

    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE accounts
      SET balance_cents = balance_cents - OLD.amount_cents
      WHERE id = OLD.account_id
      RETURNING balance_cents INTO new_balance;

    IF new_balance IS NULL THEN
      RAISE EXCEPTION 'Account % not found', OLD.account_id;
    END IF;

    IF new_balance < 0 THEN
      RAISE EXCEPTION 'Insufficient funds';
    END IF;

    RETURN OLD;
  ELSE
    RAISE EXCEPTION 'Unsupported operation %', TG_OP;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ledger_apply_balance ON ledger_entries;
CREATE TRIGGER trg_ledger_apply_balance
AFTER INSERT OR DELETE ON ledger_entries
FOR EACH ROW
EXECUTE FUNCTION apply_ledger_entry_to_balance();

CREATE OR REPLACE FUNCTION assert_transaction_balanced()
RETURNS trigger AS $$
DECLARE
  txid uuid;
  unbalanced_count integer;
BEGIN
  txid := COALESCE(NEW.transaction_id, OLD.transaction_id);

  SELECT COUNT(*) INTO unbalanced_count
  FROM (
    SELECT currency, SUM(amount_cents) AS s
    FROM ledger_entries
    WHERE transaction_id = txid
    GROUP BY currency
  ) t
  WHERE t.s <> 0;

  IF unbalanced_count > 0 THEN
    RAISE EXCEPTION 'Ledger is not balanced for transaction %', txid;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ledger_balanced ON ledger_entries;
CREATE CONSTRAINT TRIGGER trg_ledger_balanced
AFTER INSERT OR UPDATE OR DELETE ON ledger_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION assert_transaction_balanced();


