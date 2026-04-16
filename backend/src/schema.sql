-- policies
CREATE TABLE IF NOT EXISTS policies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  max_auto_amount NUMERIC NOT NULL,
  require_whitelist BOOLEAN NOT NULL DEFAULT false,
  require_manual_review_above NUMERIC NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- requests
CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  action_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  token TEXT NOT NULL,
  recipient TEXT NOT NULL,
  created_by TEXT NOT NULL,
  memo TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  risk_level TEXT,
  recommendation TEXT,
  confidence NUMERIC,
  policy_id TEXT REFERENCES policies(id),
  on_chain_request_id TEXT,
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- receipts
CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  request_id TEXT REFERENCES requests(id),
  receipt_hash TEXT,
  tx_hash TEXT,
  contract_address TEXT,
  block_number INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  fail_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

-- approvals
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  request_id TEXT REFERENCES requests(id),
  reviewer_address TEXT NOT NULL,
  decision TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed demo policies (only if table is empty)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM policies LIMIT 1) THEN
    INSERT INTO policies (id, name, max_auto_amount, require_whitelist, require_manual_review_above, active, updated_at)
    VALUES
      ('POL-001', 'Treasury Payments', 100, true, 500, true, NOW()),
      ('POL-002', 'Internal Transfers', 250, false, 1000, true, NOW());
  END IF;
END
$$;
