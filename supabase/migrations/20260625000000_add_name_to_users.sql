-- Agregar columna name a users para joins en cash_advances
-- La tabla tiene full_name (no first_name/last_name) en producción
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS name TEXT;

UPDATE public.users
SET name = full_name
WHERE name IS NULL AND full_name IS NOT NULL;

-- Fallback: usar email si full_name también es nulo
UPDATE public.users
SET name = email
WHERE name IS NULL AND email IS NOT NULL;
