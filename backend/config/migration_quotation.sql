-- ============================================
-- MailPilot — AI Quotation Agent Migration
-- Run this SQL in Supabase SQL Editor
-- AFTER the base schema.sql has been applied
-- ============================================

-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- 1. Products Catalogue
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL,
  material TEXT DEFAULT '',
  size TEXT DEFAULT '',
  specifications JSONB DEFAULT '{}'::jsonb,
  unit TEXT DEFAULT 'PCS',
  base_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT true,
  search_text TEXT DEFAULT '',
  embedding vector(768),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_material ON products(material);
CREATE INDEX IF NOT EXISTS idx_products_size ON products(size);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_search_text ON products USING gin(to_tsvector('english', search_text));

-- ============================================
-- 2. Customers
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT DEFAULT '',
  email TEXT UNIQUE NOT NULL,
  phone TEXT DEFAULT '',
  crm_customer_id TEXT DEFAULT '',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_name);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

-- ============================================
-- 3. Orders (Purchase History)
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_date TIMESTAMPTZ NOT NULL,
  order_number TEXT UNIQUE NOT NULL,
  total_amount NUMERIC(14,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);

-- ============================================
-- 4. Order Items
-- ============================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- ============================================
-- 5. Customer-Specific Pricing
-- ============================================
CREATE TABLE IF NOT EXISTS customer_product_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit_price NUMERIC(12,2) NOT NULL,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, product_id, valid_from)
);

CREATE INDEX IF NOT EXISTS idx_customer_prices_customer ON customer_product_prices(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_prices_product ON customer_product_prices(product_id);

-- ============================================
-- 6. Quotation Requests (links to email_requests)
-- ============================================
CREATE TABLE IF NOT EXISTS quotation_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID NOT NULL REFERENCES email_requests(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  status TEXT DEFAULT 'NEW' CHECK (status IN ('NEW','PROCESSING','NEEDS_REVIEW','DRAFT','APPROVED','SENT','REJECTED')),
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quotation_requests_email ON quotation_requests(email_id);
CREATE INDEX IF NOT EXISTS idx_quotation_requests_status ON quotation_requests(status);
CREATE INDEX IF NOT EXISTS idx_quotation_requests_customer ON quotation_requests(customer_id);

-- ============================================
-- 7. Quotations
-- ============================================
CREATE TABLE IF NOT EXISTS quotations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_number TEXT UNIQUE NOT NULL,
  quotation_request_id UUID NOT NULL REFERENCES quotation_requests(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','NEEDS_REVIEW','APPROVED','SENT','REJECTED')),
  subtotal NUMERIC(14,2) DEFAULT 0,
  discount NUMERIC(14,2) DEFAULT 0,
  tax NUMERIC(14,2) DEFAULT 0,
  grand_total NUMERIC(14,2) DEFAULT 0,
  notes TEXT DEFAULT '',
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotations_number ON quotations(quotation_number);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_request ON quotations(quotation_request_id);
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations(customer_id);

-- ============================================
-- 8. Quotation Items
-- ============================================
CREATE TABLE IF NOT EXISTS quotation_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  requested_description TEXT DEFAULT '',
  quantity INTEGER,
  unit_price NUMERIC(12,2) DEFAULT 0,
  line_total NUMERIC(14,2) DEFAULT 0,
  confidence NUMERIC(4,2) DEFAULT 0,
  ai_reason TEXT DEFAULT '',
  status TEXT DEFAULT 'AI_MATCHED' CHECK (status IN ('AI_MATCHED','NEEDS_REVIEW','APPROVED','REJECTED')),
  alternatives JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_product ON quotation_items(product_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_status ON quotation_items(status);

-- ============================================
-- 9. Quotation Audit Logs
-- ============================================
CREATE TABLE IF NOT EXISTS quotation_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES admins(id),
  action TEXT NOT NULL,
  old_value JSONB DEFAULT '{}'::jsonb,
  new_value JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_quotation ON quotation_audit_logs(quotation_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON quotation_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON quotation_audit_logs(created_at DESC);

-- ============================================
-- 10. Product Matching Corrections (Learning Data)
-- ============================================
CREATE TABLE IF NOT EXISTS product_matching_corrections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_item_id UUID NOT NULL REFERENCES quotation_items(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  original_text TEXT DEFAULT '',
  ai_product_id UUID REFERENCES products(id),
  human_product_id UUID REFERENCES products(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corrections_customer ON product_matching_corrections(customer_id);
CREATE INDEX IF NOT EXISTS idx_corrections_ai_product ON product_matching_corrections(ai_product_id);
CREATE INDEX IF NOT EXISTS idx_corrections_human_product ON product_matching_corrections(human_product_id);

-- ============================================
-- Auto-update triggers for new tables
-- ============================================
CREATE OR REPLACE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER quotation_requests_updated_at
  BEFORE UPDATE ON quotation_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER quotations_updated_at
  BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER quotation_items_updated_at
  BEFORE UPDATE ON quotation_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Row Level Security — disable for service_role access
-- (matches existing pattern from schema.sql)
-- ============================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_product_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_matching_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON customer_product_prices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON quotation_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON quotations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON quotation_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON quotation_audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON product_matching_corrections FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Semantic search function (cosine similarity)
-- ============================================
CREATE OR REPLACE FUNCTION match_products(query_embedding vector(768), match_threshold FLOAT DEFAULT 0.5, match_count INT DEFAULT 10)
RETURNS TABLE(
  id UUID,
  sku TEXT,
  name TEXT,
  description TEXT,
  category TEXT,
  material TEXT,
  size TEXT,
  unit TEXT,
  base_price NUMERIC,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.sku,
    p.name,
    p.description,
    p.category,
    p.material,
    p.size,
    p.unit,
    p.base_price,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM products p
  WHERE p.active = true
    AND p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> query_embedding) > match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
