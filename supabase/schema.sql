-- Vercel Integration Server Schema

-- Accounts table (stores Vercel account tokens)
CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  vercel_user_id TEXT UNIQUE NOT NULL,
  vercel_team_id TEXT,
  access_token TEXT NOT NULL, -- Encrypted
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Installations table (tracks deployed apps)
CREATE TABLE IF NOT EXISTS installations (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  installation_id TEXT UNIQUE NOT NULL,
  account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
  app_name TEXT DEFAULT 'assistant-server',
  vercel_project_id TEXT,
  vercel_project_name TEXT,
  deployment_url TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'installed', 'failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_uuid ON accounts(uuid);
CREATE INDEX IF NOT EXISTS idx_accounts_vercel_user ON accounts(vercel_user_id);
CREATE INDEX IF NOT EXISTS idx_installations_uuid ON installations(uuid);
CREATE INDEX IF NOT EXISTS idx_installations_id ON installations(installation_id);
CREATE INDEX IF NOT EXISTS idx_installations_account ON installations(account_id);

-- Enable RLS (optional, for security)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE installations ENABLE ROW LEVEL SECURITY;
