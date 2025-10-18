$BaseUrl = "http://localhost:3001"
$OrgId = "00000000-0000-0000-0000-000000000000"

Write-Host "Probando crear cliente..." -ForegroundColor Cyan

$body = @{
    organization_id = $OrgId
    name = "Juan Perez Test"
    email = "juan.test@email.com"
    phone = "555-1234"
    address = "Calle Principal 123"
} | ConvertTo-Json

Write-Host "Body: $body" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/customers" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Response completo:" -ForegroundColor Yellow
    Write-Host ($response | ConvertTo-Json -Depth 10) -ForegroundColor White
    
    if ($response.data -and $response.data.id) {
        Write-Host "Cliente creado con ID: $($response.data.id)" -ForegroundColor Green
    } else {
        Write-Host "Error: No se obtuvo ID del cliente" -ForegroundColor Red
        Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Red
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}


