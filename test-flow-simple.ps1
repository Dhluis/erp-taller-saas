# =====================================================
# PRUEBA DE FLUJO COMPLETO DEL ERP (Versión Simple)
# =====================================================

$BaseUrl = "http://localhost:3001"
$OrgId = "00000000-0000-0000-0000-000000000000"

Write-Host ""
Write-Host "====================================================" -ForegroundColor Green
Write-Host "    PRUEBA DE FLUJO COMPLETO DEL ERP" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
Write-Host ""

# 1. CREAR CLIENTE
Write-Host "PASO 1: Creando cliente..." -ForegroundColor Cyan

$customerBody = @{
    organization_id = $OrgId
    name = "Juan Perez Test"
    email = "juan.test@email.com"
    phone = "555-1234"
    address = "Calle Principal 123"
} | ConvertTo-Json

try {
    $customerResponse = Invoke-RestMethod -Uri "$BaseUrl/api/customers" -Method Post -Body $customerBody -ContentType "application/json"
    $customerId = $customerResponse.data.id
    Write-Host "Cliente creado: $customerId" -ForegroundColor Green
} catch {
    Write-Host "Error creando cliente: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 2. CREAR VEHICULO
Write-Host "PASO 2: Creando vehiculo..." -ForegroundColor Cyan

$vehicleBody = @{
    organization_id = $OrgId
    customer_id = $customerId
    brand = "Toyota"
    model = "Corolla"
    year = 2020
    license_plate = "TEST-123"
    color = "Blanco"
    mileage = 50000
} | ConvertTo-Json

try {
    $vehicleResponse = Invoke-RestMethod -Uri "$BaseUrl/api/vehicles" -Method Post -Body $vehicleBody -ContentType "application/json"
    $vehicleId = $vehicleResponse.data.id
    Write-Host "Vehiculo creado: $vehicleId" -ForegroundColor Green
} catch {
    Write-Host "Error creando vehiculo: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 3. CREAR ORDEN
Write-Host "PASO 3: Creando orden de trabajo..." -ForegroundColor Cyan

$orderBody = @{
    organization_id = $OrgId
    customer_id = $customerId
    vehicle_id = $vehicleId
    description = "Mantenimiento general - Cambio de aceite y filtros"
    notes = "Cliente solicita revision completa"
} | ConvertTo-Json

try {
    $orderResponse = Invoke-RestMethod -Uri "$BaseUrl/api/orders" -Method Post -Body $orderBody -ContentType "application/json"
    $orderId = $orderResponse.data.id
    $orderNumber = $orderResponse.data.order_number
    Write-Host "Orden creada: $orderNumber" -ForegroundColor Green
} catch {
    Write-Host "Error creando orden: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 4. AGREGAR ITEMS
Write-Host "PASO 4: Agregando items..." -ForegroundColor Cyan

$item1Body = @{
    item_type = "service"
    description = "Cambio de aceite sintetico"
    quantity = 1
    unit_price = 500.00
    tax_percent = 16
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$BaseUrl/api/orders/$orderId/items" -Method Post -Body $item1Body -ContentType "application/json" | Out-Null
    Write-Host "Item 1 agregado" -ForegroundColor Green
} catch {
    Write-Host "Error agregando item 1: $($_.Exception.Message)" -ForegroundColor Red
}

$item2Body = @{
    item_type = "product"
    description = "Filtro de aceite"
    quantity = 1
    unit_price = 150.00
    tax_percent = 16
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$BaseUrl/api/orders/$orderId/items" -Method Post -Body $item2Body -ContentType "application/json" | Out-Null
    Write-Host "Item 2 agregado" -ForegroundColor Green
} catch {
    Write-Host "Error agregando item 2: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 5. COMPLETAR ORDEN
Write-Host "PASO 5: Completando orden..." -ForegroundColor Cyan

$completeBody = @{
    status = "completed"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$BaseUrl/api/orders/$orderId" -Method Patch -Body $completeBody -ContentType "application/json" | Out-Null
    Write-Host "Orden completada" -ForegroundColor Green
} catch {
    Write-Host "Error completando orden: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 6. CREAR FACTURA
Write-Host "PASO 6: Creando factura desde orden..." -ForegroundColor Cyan

$invoiceBody = @{
    work_order_id = $orderId
} | ConvertTo-Json

try {
    $invoiceResponse = Invoke-RestMethod -Uri "$BaseUrl/api/invoices/from-order" -Method Post -Body $invoiceBody -ContentType "application/json"
    $invoiceId = $invoiceResponse.data.invoice.id
    $invoiceNumber = $invoiceResponse.data.invoice.invoice_number
    Write-Host "Factura creada: $invoiceNumber" -ForegroundColor Green
} catch {
    Write-Host "Error creando factura: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 7. ENVIAR FACTURA
Write-Host "PASO 7: Enviando factura..." -ForegroundColor Cyan

$sendBody = @{
    status = "sent"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$BaseUrl/api/invoices/$invoiceId" -Method Put -Body $sendBody -ContentType "application/json" | Out-Null
    Write-Host "Factura enviada" -ForegroundColor Green
} catch {
    Write-Host "Error enviando factura: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 8. MARCAR COMO PAGADA
Write-Host "PASO 8: Marcando como pagada..." -ForegroundColor Cyan

$paymentBody = @{
    payment_method = "transfer"
    reference = "TRX-TEST-12345"
    notes = "Pago de prueba - Transferencia bancaria"
} | ConvertTo-Json

try {
    $paymentResponse = Invoke-RestMethod -Uri "$BaseUrl/api/invoices/$invoiceId/pay" -Method Post -Body $paymentBody -ContentType "application/json"
    Write-Host "Factura pagada" -ForegroundColor Green
} catch {
    Write-Host "Error marcando como pagada: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# RESUMEN
Write-Host "====================================================" -ForegroundColor Green
Write-Host "    FLUJO COMPLETO EJECUTADO EXITOSAMENTE" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
Write-Host ""
Write-Host "RESUMEN:" -ForegroundColor Cyan
Write-Host "  Cliente:   $customerId" -ForegroundColor White
Write-Host "  Vehiculo:  $vehicleId" -ForegroundColor White
Write-Host "  Orden:     $orderNumber" -ForegroundColor White
Write-Host "  Factura:   $invoiceNumber" -ForegroundColor White
Write-Host "  Estado:    PAGADA" -ForegroundColor Green
Write-Host ""


