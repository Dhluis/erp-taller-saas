-- Migration to add signature and terms columns to work_orders table
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS customer_signature TEXT,
ADD COLUMN IF NOT EXISTS terms_type TEXT DEFAULT 'text',
ADD COLUMN IF NOT EXISTS terms_text TEXT,
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS terms_file_url TEXT;

-- Optional: If you want to move some existing inspection data logic here
COMMENT ON COLUMN work_orders.customer_signature IS 'Base64 string or URL of the customer signature image';
