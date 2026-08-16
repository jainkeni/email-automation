-- ============================================
-- MailPilot - Supabase Database Schema
-- Run this SQL in Supabase SQL Editor
-- ============================================

-- 1. Admins table
CREATE TABLE IF NOT EXISTS admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Email Requests table
CREATE TABLE IF NOT EXISTS email_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_email TEXT NOT NULL,
  from_name TEXT DEFAULT '',
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  message_id TEXT UNIQUE,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- AI Analysis (stored as JSONB)
  ai_analysis JSONB DEFAULT '{
    "customerName": "Not specified",
    "company": "Not specified",
    "productOrServiceNeeded": "",
    "specifications": "",
    "quantity": "Not specified",
    "budget": "Not specified",
    "timeline": "Not specified",
    "urgency": "medium",
    "category": "General Inquiry",
    "summary": "",
    "keyPoints": []
  }'::jsonb,

  -- AI Draft Reply
  ai_draft_reply TEXT DEFAULT '',

  -- Admin actions
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_reply TEXT DEFAULT '',
  rejection_reason TEXT DEFAULT '',
  replied_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  approved_by UUID REFERENCES admins(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Company Settings table (single row)
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT DEFAULT 'Your Company Name',
  industry TEXT DEFAULT 'B2B Solutions',
  products_and_services JSONB DEFAULT '[]'::jsonb,
  pricing_info TEXT DEFAULT '',
  business_hours TEXT DEFAULT 'Monday - Friday, 9:00 AM - 6:00 PM IST',
  location TEXT DEFAULT 'India',
  contact_email TEXT DEFAULT '',
  contact_phone TEXT DEFAULT '',
  website TEXT DEFAULT '',
  policies JSONB DEFAULT '{
    "responseTime": "Within 24 hours",
    "minimumOrderQuantity": "Varies by product",
    "paymentTerms": "Net 30 days for verified businesses",
    "shippingInfo": "Pan-India delivery available",
    "warrantyInfo": "Standard warranty included"
  }'::jsonb,
  tone_of_voice TEXT DEFAULT 'Professional, helpful, and solution-oriented',
  additional_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_email_requests_status ON email_requests(status);
CREATE INDEX IF NOT EXISTS idx_email_requests_created ON email_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_requests_urgency ON email_requests((ai_analysis->>'urgency'));
CREATE INDEX IF NOT EXISTS idx_email_requests_category ON email_requests((ai_analysis->>'category'));
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

-- ============================================
-- Auto-update updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER email_requests_updated_at
  BEFORE UPDATE ON email_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Row Level Security (RLS)
-- Disable RLS for these tables since we use 
-- our own JWT auth middleware, not Supabase Auth
-- ============================================
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Allow full access via service_role key (used by our backend)
CREATE POLICY "Service role full access" ON admins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON email_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON company_settings FOR ALL USING (true) WITH CHECK (true);
