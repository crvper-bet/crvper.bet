-- =============================================
-- CRVPER.BET Supabase Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  wallet_balance NUMERIC(12,2) DEFAULT 150.00,
  has_deposited BOOLEAN DEFAULT FALSE,
  total_deposited NUMERIC(12,2) DEFAULT 0,
  total_withdrawn NUMERIC(12,2) DEFAULT 0,
  referred_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ADMIN SETTINGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS admin_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  upi_id TEXT DEFAULT 'crvper.pay@upi',
  payee_name TEXT DEFAULT 'CRVPER',
  qr_image_url TEXT,
  min_deposit NUMERIC DEFAULT 100,
  min_withdraw NUMERIC DEFAULT 100,
  signup_bonus NUMERIC DEFAULT 150,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default admin settings row
INSERT INTO admin_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- =============================================
-- DEPOSITS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS deposits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  user_phone TEXT,
  amount NUMERIC(12,2) NOT NULL,
  utr TEXT DEFAULT 'N/A',
  screenshot_url TEXT,
  promoter_code TEXT,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ
);

-- =============================================
-- WITHDRAWALS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS withdrawals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  user_phone TEXT,
  amount NUMERIC(12,2) NOT NULL,
  upi_id TEXT DEFAULT 'QR Uploaded',
  qr_url TEXT,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','COMPLETED','REJECTED')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ
);

-- =============================================
-- TRANSACTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('BONUS','DEPOSIT','WITHDRAW','REFUND','GAME_WIN','GAME_LOSS')),
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'COMPLETED' CHECK (status IN ('PENDING','COMPLETED','REJECTED')),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PROMOTERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS promoters (
  id TEXT PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  social_username TEXT,
  password TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  total_invited INTEGER DEFAULT 0,
  total_deposits_from_invited NUMERIC(12,2) DEFAULT 0,
  commission_balance NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SUPPORT CHATS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS support_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  user_phone TEXT,
  messages JSONB DEFAULT '[]',
  status TEXT DEFAULT 'OPEN',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoters ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Allow all operations via anon key (frontend handles auth via passwords stored in DB)
-- NOTE: In production, upgrade to Supabase Auth for real JWT-based RLS

CREATE POLICY "allow_all_users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_deposits" ON deposits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_withdrawals" ON withdrawals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_promoters" ON promoters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_support_chats" ON support_chats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_read_admin_settings" ON admin_settings FOR ALL USING (true) WITH CHECK (true);
