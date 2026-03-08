import pg from 'pg';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const SCHEMA = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  plan VARCHAR(50) DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  smtp_host VARCHAR(255),
  smtp_port INTEGER DEFAULT 587,
  imap_host VARCHAR(255),
  imap_port INTEGER DEFAULT 993,
  username VARCHAR(255),
  password_encrypted TEXT,
  oauth_token TEXT,
  oauth_refresh_token TEXT,
  display_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  reputation_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warmup_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  daily_target INTEGER DEFAULT 5,
  current_daily_count INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_received INTEGER DEFAULT 0,
  total_replied INTEGER DEFAULT 0,
  ramp_up_days INTEGER DEFAULT 30,
  current_day INTEGER DEFAULT 1,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  schedule JSONB DEFAULT '{"start_hour": 8, "end_hour": 18, "days": [1,2,3,4,5]}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warmup_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES warmup_campaigns(id) ON DELETE CASCADE,
  from_account_id UUID REFERENCES email_accounts(id),
  to_account_id UUID REFERENCES email_accounts(id),
  message_id VARCHAR(255),
  thread_id VARCHAR(255),
  subject VARCHAR(500),
  status VARCHAR(50) DEFAULT 'sent',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  in_spam BOOLEAN DEFAULT false,
  rescued_from_spam BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warmup_pool (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  provider VARCHAR(50),
  smtp_host VARCHAR(255),
  smtp_port INTEGER,
  imap_host VARCHAR(255),
  imap_port INTEGER,
  username VARCHAR(255),
  password_encrypted TEXT,
  is_active BOOLEAN DEFAULT true,
  emails_sent_today INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  emails_sent INTEGER DEFAULT 0,
  emails_received INTEGER DEFAULT 0,
  emails_replied INTEGER DEFAULT 0,
  spam_count INTEGER DEFAULT 0,
  inbox_rate DECIMAL(5,2) DEFAULT 0,
  reputation_score INTEGER DEFAULT 0,
  UNIQUE(account_id, date)
);

CREATE INDEX IF NOT EXISTS idx_warmup_emails_campaign ON warmup_emails(campaign_id);
CREATE INDEX IF NOT EXISTS idx_warmup_emails_status ON warmup_emails(status);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_account ON analytics_daily(account_id, date);
CREATE INDEX IF NOT EXISTS idx_campaigns_user ON warmup_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON email_accounts(user_id);
`;

export async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(SCHEMA);
    logger.info('Database schema initialized');
  } finally {
    client.release();
  }
}

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 1000) {
    logger.warn('Slow query detected', { text, duration });
  }
  return res;
}
