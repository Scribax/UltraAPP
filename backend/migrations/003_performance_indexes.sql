-- =========================================
-- 003_performance_indexes.sql
-- Optimización Enterprise: Índices para Alta Concurrencia
-- =========================================

-- 1. Habilitar extensión para búsquedas de texto difuso (ultra rápido para el buscador)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Índices de texto (Buscador de Productos)
-- Esto hace que búsquedas como "ILIKE '%coca%'" sean instantáneas
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);

-- 3. Índices Parciales (Filtros de estado)
-- Como siempre buscamos productos "deleted_at IS NULL", un índice parcial es súper eficiente
CREATE INDEX IF NOT EXISTS idx_products_active_biz ON products(business_id) WHERE deleted_at IS NULL;

-- 4. Índices Compuestos para Reportes y Dashboard
-- El Dashboard filtra ventas por `business_id` y un rango de fechas (`created_at`) y un `status`
CREATE INDEX IF NOT EXISTS idx_sales_biz_date_status ON sales(business_id, created_at, status);

-- 5. Índices de Claves Foráneas (Foreign Keys)
-- Las bases de datos relacionales NO indexan los Foreign Keys por defecto. 
-- Al borrarlos o hacer JOINs (como en reportes), sin índice se hace un Full Table Scan.
CREATE INDEX IF NOT EXISTS idx_users_biz_id ON users(business_id);
CREATE INDEX IF NOT EXISTS idx_categories_biz_id ON categories(business_id);
CREATE INDEX IF NOT EXISTS idx_products_cat_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_cash_register_biz_date ON cash_register(business_id, created_at DESC);
