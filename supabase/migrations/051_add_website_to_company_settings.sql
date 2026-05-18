-- Add website column to company_settings
-- Run this in Supabase SQL Editor to enable website persistence in onboarding wizard
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS website TEXT;
