-- =========================================
-- 004_profit_and_expenses.sql
-- Control de Gastos y Rentabilidad
-- =========================================

-- 1. Añadir precio de compra a los items de venta para cálculo de ganancia histórico
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS buy_price DECIMAL(12,2);

-- 2. Actualizar items existentes con el precio de compra actual de los productos (estimación)
UPDATE sale_items si
SET buy_price = p.buy_price
FROM products p
WHERE si.product_id = p.id AND si.buy_price IS NULL;

-- 3. Crear tabla de Gastos
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category VARCHAR(50) DEFAULT 'otros', -- 'alquiler', 'servicios', 'sueldos', etc.
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Índice para velocidad en reportes de gastos
CREATE INDEX IF NOT EXISTS idx_expenses_biz_date ON expenses(business_id, date DESC);
