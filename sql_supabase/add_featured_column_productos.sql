-- Migration to add featured products column
ALTER TABLE productos
ADD COLUMN destacado boolean DEFAULT false;

-- Example: Set some products as featured (optional)
-- UPDATE productos SET destacado = true WHERE sku IN ('SKU1', 'SKU2');
