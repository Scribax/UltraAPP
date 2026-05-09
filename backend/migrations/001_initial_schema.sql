-- =============================================
-- MI APP - Migración Completa v2
-- Ejecutar en orden con: node migrations/run.js
-- =============================================

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================
-- USUARIOS
-- ========================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(150),
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- NEGOCIOS
-- ========================
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) UNIQUE,              -- para catálogo público /store/:slug
  type VARCHAR(50),                      -- kiosco, barberia, ferreteria, etc.
  address TEXT,
  phone VARCHAR(30),
  logo_url TEXT,
  currency CHAR(3) DEFAULT 'ARS',
  timezone VARCHAR(50) DEFAULT 'America/Argentina/Buenos_Aires',
  opening_hours JSONB,                   -- { mon: "09:00-18:00", ... }
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- SUSCRIPCIONES
-- ========================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  plan VARCHAR(20) DEFAULT 'free',       -- free | pro
  status VARCHAR(20) DEFAULT 'active',   -- active | cancelled | expired
  expires_at TIMESTAMPTZ,
  payment_ref TEXT,                      -- referencia externa de pago
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- CATEGORÍAS
-- ========================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  color VARCHAR(7),                      -- hex color para UI #FF5733
  icon VARCHAR(50),                      -- emoji o nombre de icono
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- EMPLEADOS (Plan PRO)
-- ========================
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  role VARCHAR(50) DEFAULT 'cashier',    -- owner | cashier | manager
  pin_code VARCHAR(10),                  -- PIN numérico para login rápido
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- PRODUCTOS
-- ========================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  barcode VARCHAR(100),
  buy_price DECIMAL(12,2),
  sell_price DECIMAL(12,2) NOT NULL,
  stock INT DEFAULT 0,
  min_stock INT DEFAULT 5,               -- alerta de stock bajo
  max_stock INT,                         -- stock máximo deseado
  unit VARCHAR(30) DEFAULT 'unidad',
  is_active BOOLEAN DEFAULT TRUE,
  deleted_at TIMESTAMPTZ,                -- soft delete
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- VENTAS
-- ========================
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  total DECIMAL(12,2) NOT NULL,
  discount DECIMAL(12,2) DEFAULT 0,
  payment_method VARCHAR(30) DEFAULT 'efectivo', -- efectivo | tarjeta | transferencia
  status VARCHAR(20) DEFAULT 'completed',         -- completed | cancelled
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- ITEMS DE VENTA
-- ========================
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(200) NOT NULL,    -- snapshot del nombre (por si se borra)
  quantity INT NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL
);

-- ========================
-- MOVIMIENTOS DE STOCK
-- ========================
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(200),             -- snapshot del nombre
  type VARCHAR(20) NOT NULL,             -- sale | adjustment | restock | import
  quantity INT NOT NULL,                 -- negativo = salida, positivo = entrada
  stock_before INT,
  stock_after INT,
  reference_id UUID,                     -- sale_id si es por venta
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- AUDIT LOGS
-- ========================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  user_id UUID REFERENCES users(id),
  employee_id UUID REFERENCES employees(id),
  action VARCHAR(100) NOT NULL,          -- product.created, sale.cancelled, etc.
  entity VARCHAR(50),                    -- product | sale | employee | business
  entity_id UUID,
  details JSONB,                         -- datos antes/después del cambio
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- ÍNDICES
-- ========================
CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_sales_business_date ON sales(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(business_id, status);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_business ON audit_logs(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_employees_business ON employees(business_id);
CREATE INDEX IF NOT EXISTS idx_categories_business ON categories(business_id);
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug);
CREATE INDEX IF NOT EXISTS idx_subscriptions_business ON subscriptions(business_id);
