-- Add vehicle_condition checklist to vehicle_inspections
-- Stores exterior/interior/accesorios SI/NO checklist as JSONB
ALTER TABLE vehicle_inspections ADD COLUMN IF NOT EXISTS vehicle_condition JSONB DEFAULT NULL;
