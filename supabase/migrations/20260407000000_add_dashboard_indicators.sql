-- Migration: Add dashboard indicators to vehicle inspections
-- Description: Adds a jsonb column to store which dashboard indicators (check engine, oil, battery, etc.) are active during vehicle reception.

ALTER TABLE public.vehicle_inspections 
ADD COLUMN IF NOT EXISTS dashboard_indicators JSONB DEFAULT '{}'::jsonb;

-- Comment for the column
COMMENT ON COLUMN public.vehicle_inspections.dashboard_indicators IS 'Stores boolean flags for active dashboard indicators at reception (e.g., {"check_engine": true, "battery": false})';
