-- Database schema for ThreeD4G CMS

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  category VARCHAR(100),
  featured BOOLEAN DEFAULT false,
  price DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

-- Product Images table (multiple images per product)
CREATE TABLE IF NOT EXISTS product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text VARCHAR(255),
  sort_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);

-- Product Variants table (multiple sizes/versions with different prices)
CREATE TABLE IF NOT EXISTS product_variants (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  price DECIMAL(10, 2) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  in_stock BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);

-- Checkout reservations table
CREATE TABLE IF NOT EXISTS checkout_reservations (
  reservation_token VARCHAR(64) PRIMARY KEY,
  payment_intent_id VARCHAR(255) UNIQUE,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  shipping_name VARCHAR(255) NOT NULL,
  shipping_phone VARCHAR(50),
  shipping_address_line1 VARCHAR(255) NOT NULL,
  shipping_address_line2 VARCHAR(255),
  shipping_city VARCHAR(255) NOT NULL,
  shipping_state VARCHAR(255) NOT NULL,
  shipping_postal_code VARCHAR(50) NOT NULL,
  shipping_country VARCHAR(2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'reserved',
  currency VARCHAR(10) NOT NULL DEFAULT 'aud',
  subtotal DECIMAL(10, 2) NOT NULL,
  shipping_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  released_at TIMESTAMP WITH TIME ZONE,
  consumed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_checkout_reservations_payment_intent_id ON checkout_reservations(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_checkout_reservations_status ON checkout_reservations(status);
CREATE INDEX IF NOT EXISTS idx_checkout_reservations_expires_at ON checkout_reservations(expires_at);

-- Checkout reservation line items
CREATE TABLE IF NOT EXISTS checkout_reservation_items (
  id SERIAL PRIMARY KEY,
  reservation_token VARCHAR(64) NOT NULL REFERENCES checkout_reservations(reservation_token) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  variant_id INTEGER NOT NULL REFERENCES product_variants(id),
  product_name VARCHAR(255) NOT NULL,
  variant_name VARCHAR(255) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_checkout_reservation_items_reservation_token ON checkout_reservation_items(reservation_token);
CREATE INDEX IF NOT EXISTS idx_checkout_reservation_items_variant_id ON checkout_reservation_items(variant_id);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  shipping_name VARCHAR(255) NOT NULL,
  shipping_phone VARCHAR(50),
  shipping_address_line1 VARCHAR(255) NOT NULL,
  shipping_address_line2 VARCHAR(255),
  shipping_city VARCHAR(255) NOT NULL,
  shipping_state VARCHAR(255) NOT NULL,
  shipping_postal_code VARCHAR(50) NOT NULL,
  shipping_country VARCHAR(2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  tracking_number VARCHAR(255),
  tracking_url TEXT,
  shipped_at TIMESTAMP WITH TIME ZONE,
  currency VARCHAR(10) NOT NULL DEFAULT 'aud',
  subtotal DECIMAL(10, 2) NOT NULL,
  shipping_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON orders(tracking_number);

-- Order line items
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  variant_id INTEGER NOT NULL REFERENCES product_variants(id),
  product_name VARCHAR(255) NOT NULL,
  variant_name VARCHAR(255) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  line_total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Migration: Add price column if it doesn't exist (for existing databases)
-- Run this manually: ALTER TABLE products ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2);

-- Migration: Add stock quantity to variants (for existing databases)
-- Run this manually:
-- ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0;
-- UPDATE product_variants SET in_stock = (stock_quantity > 0);

-- Migration: Create checkout tables (for existing databases)
-- Run this manually if needed:
-- CREATE TABLE IF NOT EXISTS checkout_reservations (
--   reservation_token VARCHAR(64) PRIMARY KEY,
--   payment_intent_id VARCHAR(255) UNIQUE,
--   customer_name VARCHAR(255) NOT NULL,
--   customer_email VARCHAR(255) NOT NULL,
--   shipping_name VARCHAR(255) NOT NULL,
--   shipping_phone VARCHAR(50),
--   shipping_address_line1 VARCHAR(255) NOT NULL,
--   shipping_address_line2 VARCHAR(255),
--   shipping_city VARCHAR(255) NOT NULL,
--   shipping_state VARCHAR(255) NOT NULL,
--   shipping_postal_code VARCHAR(50) NOT NULL,
--   shipping_country VARCHAR(2) NOT NULL,
--   status VARCHAR(50) NOT NULL DEFAULT 'reserved',
--   currency VARCHAR(10) NOT NULL DEFAULT 'aud',
--   subtotal DECIMAL(10, 2) NOT NULL,
--   shipping_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
--   total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
--   expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
--   released_at TIMESTAMP WITH TIME ZONE,
--   consumed_at TIMESTAMP WITH TIME ZONE,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );
-- CREATE TABLE IF NOT EXISTS checkout_reservation_items (
--   id SERIAL PRIMARY KEY,
--   reservation_token VARCHAR(64) NOT NULL REFERENCES checkout_reservations(reservation_token) ON DELETE CASCADE,
--   product_id INTEGER NOT NULL REFERENCES products(id),
--   variant_id INTEGER NOT NULL REFERENCES product_variants(id),
--   product_name VARCHAR(255) NOT NULL,
--   variant_name VARCHAR(255) NOT NULL,
--   unit_price DECIMAL(10, 2) NOT NULL,
--   quantity INTEGER NOT NULL,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );
-- CREATE TABLE IF NOT EXISTS orders (
--   id SERIAL PRIMARY KEY,
--   customer_name VARCHAR(255) NOT NULL,
--   customer_email VARCHAR(255) NOT NULL,
--   shipping_name VARCHAR(255) NOT NULL,
--   shipping_phone VARCHAR(50),
--   shipping_address_line1 VARCHAR(255) NOT NULL,
--   shipping_address_line2 VARCHAR(255),
--   shipping_city VARCHAR(255) NOT NULL,
--   shipping_state VARCHAR(255) NOT NULL,
--   shipping_postal_code VARCHAR(50) NOT NULL,
--   shipping_country VARCHAR(2) NOT NULL,
--   status VARCHAR(50) NOT NULL DEFAULT 'pending',
--   payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
--   stripe_payment_intent_id VARCHAR(255) UNIQUE,
--   tracking_number VARCHAR(255),
--   tracking_url TEXT,
--   shipped_at TIMESTAMP WITH TIME ZONE,
--   tracking_number VARCHAR(255),
--   tracking_url TEXT,
--   shipped_at TIMESTAMP WITH TIME ZONE,
--   currency VARCHAR(10) NOT NULL DEFAULT 'aud',
--   subtotal DECIMAL(10, 2) NOT NULL,
--   shipping_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
--   total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );
-- CREATE TABLE IF NOT EXISTS order_items (
--   id SERIAL PRIMARY KEY,
--   order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
--   product_id INTEGER NOT NULL REFERENCES products(id),
--   variant_id INTEGER NOT NULL REFERENCES product_variants(id),
--   product_name VARCHAR(255) NOT NULL,
--   variant_name VARCHAR(255) NOT NULL,
--   unit_price DECIMAL(10, 2) NOT NULL,
--   quantity INTEGER NOT NULL,
--   line_total DECIMAL(10, 2) NOT NULL,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid';
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255) UNIQUE;
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'aud';

-- Links table (for linktree-style page)
CREATE TABLE IF NOT EXISTS links (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  promo_code VARCHAR(100),
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_links_sort_order ON links(sort_order);
CREATE INDEX IF NOT EXISTS idx_links_active ON links(active);

