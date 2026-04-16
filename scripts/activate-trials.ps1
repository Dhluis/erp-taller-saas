$SUPABASE_URL = "https://igshgleciwknpupbmvhn.supabase.co"
$SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnc2hnbGVjaXdrbnB1cGJtdmhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODczMjUyMCwiZXhwIjoyMDc0MzA4NTIwfQ.2lt7F9Yt-2qhg4qsxCQWktAXszoTgs6JGkdzNm_Z4yI"

$SQL = @"
UPDATE organizations
SET
  plan_tier           = 'premium',
  subscription_status = 'trial',
  trial_ends_at       = (NOW() + INTERVAL '7 days'),
  plan_started_at     = COALESCE(plan_started_at, NOW()),
  updated_at          = NOW()
WHERE
  subscription_status IN ('free', 'expired_trial', 'expired', 'inactive', 'canceled')
  OR (subscription_status IS NULL AND (plan_tier = 'free' OR plan_tier IS NULL));
"@

$body = @{ query = $SQL } | ConvertTo-Json

Write-Host "Ejecutando migración en Supabase..." -ForegroundColor Cyan

$response = Invoke-RestMethod `
  -Uri "$SUPABASE_URL/rest/v1/rpc/exec_sql" `
  -Method POST `
  -Headers @{
    "apikey"        = $SERVICE_ROLE_KEY
    "Authorization" = "Bearer $SERVICE_ROLE_KEY"
    "Content-Type"  = "application/json"
  } `
  -Body $body

Write-Host "Respuesta:" -ForegroundColor Green
$response | ConvertTo-Json

# ----- Verificación: mostrar el estado actual de las organizaciones -----
Write-Host "`nVerificando resultado..." -ForegroundColor Cyan

$verifyBody = @{
  query = "SELECT subscription_status, plan_tier, COUNT(*) as total FROM organizations GROUP BY subscription_status, plan_tier ORDER BY total DESC;"
} | ConvertTo-Json

$verify = Invoke-RestMethod `
  -Uri "$SUPABASE_URL/rest/v1/rpc/exec_sql" `
  -Method POST `
  -Headers @{
    "apikey"        = $SERVICE_ROLE_KEY
    "Authorization" = "Bearer $SERVICE_ROLE_KEY"
    "Content-Type"  = "application/json"
  } `
  -Body $verifyBody

Write-Host "Estado de organizaciones:" -ForegroundColor Green
$verify | ConvertTo-Json
