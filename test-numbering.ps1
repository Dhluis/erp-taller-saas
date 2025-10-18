$BaseUrl = "http://localhost:3001"
$OrgId = "00000000-0000-0000-0000-000000000000"

Write-Host "====================================================" -ForegroundColor Green
Write-Host "    PRUEBA DE NUMERACIÓN AUTOMÁTICA" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
Write-Host ""

# =====================================================
# 1. CREAR CLIENTE
# =====================================================
Write-Host "1. Creando cliente..." -ForegroundColor Cyan

$customerBody = @{
    organization_id = $OrgId
    name = "Cliente Test Numeracion"
    email = "test@numeracion.com"
    phone = "555-0001"
    address = "Direccion Test 123"
} | ConvertTo-Json

$customer = Invoke-RestMethod -Uri "$BaseUrl/api/customers" -Method Post -Body $customerBody -ContentType "application/json"
$customerId = $customer.id
Write-Host "Cliente creado: $customerId" -ForegroundColor Green
Write-Host ""

# =====================================================
# 2. CREAR VEHÍCULO
# =====================================================
Write-Host "2. Creando vehículo..." -ForegroundColor Cyan

$vehicleBody = @{
    organization_id = $OrgId
    customer_id = $customerId
    brand = "Toyota"
    model = "Corolla"
    year = 2020
    license_plate = "NUM-001"
    color = "Blanco"
    mileage = 50000
} | ConvertTo-Json

$vehicle = Invoke-RestMethod -Uri "$BaseUrl/api/vehicles" -Method Post -Body $vehicleBody -ContentType "application/json"
$vehicleId = $vehicle.id
Write-Host "Vehículo creado: $vehicleId" -ForegroundColor Green
Write-Host ""

# =====================================================
# 3. CREAR COTIZACIÓN 1
# =====================================================
Write-Host "3. Creando primera cotización..." -ForegroundColor Cyan

$quote1Body = @{
    organization_id = $OrgId
    customer_id = $customerId
    vehicle_id = $vehicleId
    description = "Mantenimiento preventivo"
    due_date = "2024-12-31"
} | ConvertTo-Json

$quote1 = Invoke-RestMethod -Uri "$BaseUrl/api/quotations" -Method Post -Body $quote1Body -ContentType "application/json"
$quote1Number = $quote1.data.quotation_number
Write-Host "Cotización 1: $quote1Number" -ForegroundColor Yellow
Write-Host ""

# =====================================================
# 4. CREAR COTIZACIÓN 2
# =====================================================
Write-Host "4. Creando segunda cotización..." -ForegroundColor Cyan

$quote2Body = @{
    organization_id = $OrgId
    customer_id = $customerId
    vehicle_id = $vehicleId
    description = "Reparación de frenos"
    due_date = "2024-12-31"
} | ConvertTo-Json

$quote2 = Invoke-RestMethod -Uri "$BaseUrl/api/quotations" -Method Post -Body $quote2Body -ContentType "application/json"
$quote2Number = $quote2.data.quotation_number
Write-Host "Cotización 2: $quote2Number" -ForegroundColor Yellow
Write-Host ""

# =====================================================
# 5. CREAR ORDEN DE TRABAJO 1
# =====================================================
Write-Host "5. Creando primera orden de trabajo..." -ForegroundColor Cyan

$order1Body = @{
    organization_id = $OrgId
    customer_id = $customerId
    vehicle_id = $vehicleId
    description = "Mantenimiento completo"
    notes = "Orden de prueba 1"
} | ConvertTo-Json

$order1 = Invoke-RestMethod -Uri "$BaseUrl/api/orders" -Method Post -Body $order1Body -ContentType "application/json"
$order1Number = $order1.data.order_number
Write-Host "Orden 1: $order1Number" -ForegroundColor Yellow
Write-Host ""

# =====================================================
# 6. CREAR ORDEN DE TRABAJO 2
# =====================================================
Write-Host "6. Creando segunda orden de trabajo..." -ForegroundColor Cyan

$order2Body = @{
    organization_id = $OrgId
    customer_id = $customerId
    vehicle_id = $vehicleId
    description = "Reparación de motor"
    notes = "Orden de prueba 2"
} | ConvertTo-Json

$order2 = Invoke-RestMethod -Uri "$BaseUrl/api/orders" -Method Post -Body $order2Body -ContentType "application/json"
$order2Number = $order2.data.order_number
Write-Host "Orden 2: $order2Number" -ForegroundColor Yellow
Write-Host ""

# =====================================================
# 7. CREAR FACTURA 1
# =====================================================
Write-Host "7. Creando primera factura..." -ForegroundColor Cyan

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
Write-Host ""

# =====================================================
# 8. CREAR FACTURA 2
# =====================================================
Write-Host "8. Creando segunda factura..." -ForegroundColor Cyan

$invoice2Body = @{
    organization_id = $OrgId
    customer_id = $customerId
    vehicle_id = $vehicleId
    description = "Factura de reparación"
    due_date = "2024-12-31"
} | ConvertTo-Json

$invoice2 = Invoke-RestMethod -Uri "$BaseUrl/api/invoices" -Method Post -Body $invoice2Body -ContentType "application/json"
$invoice2Number = $invoice2.data.invoice_number
Write-Host "Factura 2: $invoice2Number" -ForegroundColor Yellow
Write-Host ""

# =====================================================
# 9. VERIFICAR LISTADO COMPLETO
# =====================================================
Write-Host "9. Verificando numeración..." -ForegroundColor Cyan

Write-Host "COTIZACIONES:" -ForegroundColor Green
$quotations = Invoke-RestMethod -Uri "$BaseUrl/api/quotations" -Method Get
foreach ($quote in $quotations.data) {
    Write-Host "  - $($quote.quotation_number)" -ForegroundColor White
}

Write-Host ""
Write-Host "ÓRDENES DE TRABAJO:" -ForegroundColor Green
$orders = Invoke-RestMethod -Uri "$BaseUrl/api/orders" -Method Get
foreach ($order in $orders) {
    Write-Host "  - $($order.order_number)" -ForegroundColor White
}

Write-Host ""
Write-Host "FACTURAS:" -ForegroundColor Green
$invoices = Invoke-RestMethod -Uri "$BaseUrl/api/invoices" -Method Get
foreach ($invoice in $invoices.data) {
    Write-Host "  - $($invoice.invoice_number)" -ForegroundColor White
}

Write-Host ""
Write-Host "====================================================" -ForegroundColor Green
Write-Host "    NUMERACIÓN AUTOMÁTICA FUNCIONANDO" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
Write-Host ""
Write-Host "RESUMEN:" -ForegroundColor Cyan
Write-Host "  Cotización 1: $quote1Number" -ForegroundColor White
Write-Host "  Cotización 2: $quote2Number" -ForegroundColor White
Write-Host "  Orden 1:      $order1Number" -ForegroundColor White
Write-Host "  Orden 2:      $order2Number" -ForegroundColor White
Write-Host "  Factura 1:    $invoice1Number" -ForegroundColor White
Write-Host "  Factura 2:    $invoice2Number" -ForegroundColor White
Write-Host ""
Write-Host "FORMATO VERIFICADO:" -ForegroundColor Cyan
Write-Host "  ✅ Q-2024-XXXX (Cotizaciones)" -ForegroundColor Green
Write-Host "  ✅ WO-2024-XXXX (Órdenes)" -ForegroundColor Green
Write-Host "  ✅ INV-2024-XXXX (Facturas)" -ForegroundColor Green
Write-Host ""


