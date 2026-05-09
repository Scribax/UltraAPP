-- Agregar columna image_url a la tabla products
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Crear tabla para movimientos de caja (Pilar 2)
CREATE TABLE IF NOT EXISTS cash_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(20) NOT NULL, -- 'open', 'close', 'in', 'out'
  amount DECIMAL(12,2) NOT NULL,
  balance DECIMAL(12,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
