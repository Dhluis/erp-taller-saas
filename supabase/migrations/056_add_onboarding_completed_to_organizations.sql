-- Agrega campo onboarding_completed a organizations para persistir
-- el estado del wizard de configuración inicial en la BD.
-- Necesario porque localStorage se borra en Safari y modo privado.

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Marcar orgs existentes que ya tienen company_settings como completadas
-- (ya pasaron por el setup en algún momento)
UPDATE organizations o
SET onboarding_completed = true
WHERE EXISTS (
  SELECT 1 FROM company_settings cs
  WHERE cs.organization_id = o.id
);
