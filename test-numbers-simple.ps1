$BaseUrl = "http://localhost:3001"
$OrgId = "00000000-0000-0000-0000-000000000000"

Write-Host "PRUEBA DE NUMERACION AUTOMATICA" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

# 1. Crear cliente
Write-Host "1. Creando cliente..." -ForegroundColor Cyan
$customerBody = @{
    organization_id = $OrgId
    name = "Cliente Test Numeracion"
    email = "test@numeracion.com"
    phone = "555-0001"
} | ConvertTo-Json

$customer = Invoke-RestMethod -Uri "$BaseUrl/api/customers" -Method Post -Body $customerBody -ContentType "application/json"
$customerId = $customer.id
Write-Host "Cliente creado: $customerId" -ForegroundColor Green

# 2. Crear vehiculo
Write-Host "2. Creando vehiculo..." -ForegroundColor Cyan
$vehicleBody = @{
    organization_id = $OrgId
    customer_id = $customerId
    brand = "Toyota"
    model = "Corolla"
    year = 2020
    license_plate = "NUM-001"
} | ConvertTo-Json

$vehicle = Invoke-RestMethod -Uri "$BaseUrl/api/vehicles" -Method Post -Body $vehicleBody -ContentType "application/json"
$vehicleId = $vehicle.id
Write-Host "Vehiculo creado: $vehicleId" -ForegroundColor Green

# 3. Crear cotizacion 1
Write-Host "3. Creando cotizacion 1..." -ForegroundColor Cyan
$quote1Body = @{
    organization_id = $OrgId
    customer_id = $customerId
    vehicle_id = $vehicleId
    description = "Mantenimiento preventivo"
    due_date = "2024-12-31"
} | ConvertTo-Json

$quote1 = Invoke-RestMethod -Uri "$BaseUrl/api/quotations" -Method Post -Body $quote1Body -ContentType "application/json"
$quote1Number = $quote1.data.quotation_number
Write-Host "Cotizacion 1: $quote1Number" -ForegroundColor Yellow

# 4. Crear cotizacion 2
Write-Host "4. Creando cotizacion 2..." -ForegroundColor Cyan
$quote2 = Invoke-RestMethod -Uri "$BaseUrl/api/quotations" -Method Post -Body $quote1Body -ContentType "application/json"
$quote2Number = $quote2.data.quotation_number
Write-Host "Cotizacion 2: $quote2Number" -ForegroundColor Yellow

# 5. Crear orden 1
Write-Host "5. Creando orden 1..." -ForegroundColor Cyan
$order1Body = @{
    organization_id = $OrgId
    customer_id = $customerId
    vehicle_id = $vehicleId
    description = "Mantenimiento completo"
} | ConvertTo-Json

$order1 = Invoke-RestMethod -Uri "$BaseUrl/api/orders" -Method Post -Body $order1Body -ContentType "application/json"
$order1Number = $order1.data.order_number
Write-Host "Orden 1: $order1Number" -ForegroundColor Yellow

# 6. Crear orden 2
Write-Host "6. Creando orden 2..." -ForegroundColor Cyan
$order2 = Invoke-RestMethod -Uri "$BaseUrl/api/orders" -Method Post -Body $order1Body -ContentType "application/json"
$order2Number = $order2.data.order_number
Write-Host "Orden 2: $order2Number" -ForegroundColor Yellow

# 7. Crear factura 1
Write-Host "7. Creando factura 1..." -ForegroundColor Cyan
$invoice1Body = @{
    organization_id = $OrgId
    customer_id = $customerId
    vehicle_id = $vehicleId
    description = "Factura de mantenimiento"
    due_date = "2024-12-31"
} | ConvertTo-Json

$invoice1 = Invoke-RestMethod -Uri "$BaseUrl/api/invoices" -Method Post -Body $invoice1Body -ContentType "application/json"
$invoice1Number = $invoice1.data.invoice_number
Write-Host "Factura 1: $invoice1Number" -ForegroundColor Yellow

# 8. Crear factura 2
Write-Host "8. Creando factura 2..." -ForegroundColor Cyan
$invoice2 = Invoke-RestMethod -Uri "$BaseUrl/api/invoices" -Method Post -Body $invoice1Body -ContentType "application/json"
$invoice2Number = $invoice2.data.invoice_number
Write-Host "Factura 2: $invoice2Number" -ForegroundColor Yellow

Write-Host ""
Write-Host "NUMERACION VERIFICADA:" -ForegroundColor Green
Write-Host "Cotizacion 1: $quote1Number" -ForegroundColor White
Write-Host "Cotizacion 2: $quote2Number" -ForegroundColor White
Write-Host "Orden 1:      $order1Number" -ForegroundColor White
Write-Host "Orden 2:      $order2Number" -ForegroundColor White
Write-Host "Factura 1:    $invoice1Number" -ForegroundColor White
Write-Host "Factura 2:    $invoice2Number" -ForegroundColor White
Write-Host ""
Write-Host "FORMATOS:" -ForegroundColor Cyan
Write-Host "Q-2024-XXXX (Cotizaciones)" -ForegroundColor Green
Write-Host "WO-2024-XXXX (Ordenes)" -ForegroundColor Green
Write-Host "INV-2024-XXXX (Facturas)" -ForegroundColor Green


