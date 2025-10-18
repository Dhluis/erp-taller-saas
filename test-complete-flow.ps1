# =====================================================
# PRUEBA DE FLUJO COMPLETO DEL ERP
# =====================================================
# Este script prueba el flujo completo:
# Cliente -> Vehículo -> Orden -> Factura -> Pago
# =====================================================

$BaseUrl = "http://localhost:3001"
$OrgId = "00000000-0000-0000-0000-000000000000"

Write-Host ""
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                                                ║" -ForegroundColor Green
Write-Host "║   🧪  PRUEBA DE FLUJO COMPLETO DEL ERP         ║" -ForegroundColor Green
Write-Host "║                                                ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# =====================================================
# 1. CREAR CLIENTE
# =====================================================
Write-Host "📋 PASO 1: Creando cliente..." -ForegroundColor Cyan

$customerBody = @{
    organization_id = $OrgId
    name = "Juan Pérez Test"
    email = "juan.test@email.com"
    phone = "555-1234"
    address = "Calle Principal 123"
} | ConvertTo-Json

$customerResponse = Invoke-RestMethod -Uri "$BaseUrl/api/customers" -Method Post -Body $customerBody -ContentType "application/json"

Write-Host ($customerResponse | ConvertTo-Json -Depth 10) -ForegroundColor Gray

if (-not $customerResponse.data.id) {
    Write-Host "❌ Error: No se pudo crear el cliente" -ForegroundColor Red
    exit 1
}

$customerId = $customerResponse.data.id
Write-Host "✅ Cliente creado: $customerId" -ForegroundColor Green
Write-Host ""

# =====================================================
# 2. CREAR VEHÍCULO
# =====================================================
Write-Host "🚗 PASO 2: Creando vehículo..." -ForegroundColor Cyan

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

$vehicleResponse = Invoke-RestMethod -Uri "$BaseUrl/api/vehicles" -Method Post -Body $vehicleBody -ContentType "application/json"

Write-Host ($vehicleResponse | ConvertTo-Json -Depth 10) -ForegroundColor Gray

if (-not $vehicleResponse.data.id) {
    Write-Host "❌ Error: No se pudo crear el vehículo" -ForegroundColor Red
    exit 1
}

$vehicleId = $vehicleResponse.data.id
Write-Host "✅ Vehículo creado: $vehicleId" -ForegroundColor Green
Write-Host ""

# =====================================================
# 3. CREAR ORDEN DE TRABAJO
# =====================================================
Write-Host "🔧 PASO 3: Creando orden de trabajo..." -ForegroundColor Cyan

$orderBody = @{
    organization_id = $OrgId
    customer_id = $customerId
    vehicle_id = $vehicleId
    description = "Mantenimiento general - Cambio de aceite y filtros"
    notes = "Cliente solicita revisión completa"
} | ConvertTo-Json

$orderResponse = Invoke-RestMethod -Uri "$BaseUrl/api/orders" -Method Post -Body $orderBody -ContentType "application/json"

Write-Host ($orderResponse | ConvertTo-Json -Depth 10) -ForegroundColor Gray

if (-not $orderResponse.data.id) {
    Write-Host "❌ Error: No se pudo crear la orden" -ForegroundColor Red
    exit 1
}

$orderId = $orderResponse.data.id
$orderNumber = $orderResponse.data.order_number
Write-Host "✅ Orden creada: $orderNumber ($orderId)" -ForegroundColor Green
Write-Host ""

# =====================================================
# 4. AGREGAR ITEMS A LA ORDEN
# =====================================================
Write-Host "📦 PASO 4: Agregando items a la orden..." -ForegroundColor Cyan

# Item 1: Servicio
$item1Body = @{
    item_type = "service"
    description = "Cambio de aceite sintético"
    quantity = 1
    unit_price = 500.00
    tax_percent = 16
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BaseUrl/api/orders/$orderId/items" -Method Post -Body $item1Body -ContentType "application/json" | Out-Null
Write-Host "✅ Item 1 agregado (Servicio)" -ForegroundColor Green

# Item 2: Producto
$item2Body = @{
    item_type = "product"
    description = "Filtro de aceite"
    quantity = 1
    unit_price = 150.00
    tax_percent = 16
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BaseUrl/api/orders/$orderId/items" -Method Post -Body $item2Body -ContentType "application/json" | Out-Null
Write-Host "✅ Item 2 agregado (Producto)" -ForegroundColor Green
Write-Host ""

# =====================================================
# 5. COMPLETAR ORDEN
# =====================================================
Write-Host "✅ PASO 5: Completando orden de trabajo..." -ForegroundColor Cyan

$completeBody = @{
    status = "completed"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BaseUrl/api/orders/$orderId" -Method Patch -Body $completeBody -ContentType "application/json" | Out-Null
Write-Host "✅ Orden completada" -ForegroundColor Green
Write-Host ""

# =====================================================
# 6. CREAR FACTURA DESDE ORDEN
# =====================================================
Write-Host "💰 PASO 6: Creando factura desde orden..." -ForegroundColor Cyan

$invoiceBody = @{
    work_order_id = $orderId
} | ConvertTo-Json

$invoiceResponse = Invoke-RestMethod -Uri "$BaseUrl/api/invoices/from-order" -Method Post -Body $invoiceBody -ContentType "application/json"

Write-Host ($invoiceResponse | ConvertTo-Json -Depth 10) -ForegroundColor Gray

if (-not $invoiceResponse.data.invoice.id) {
    Write-Host "❌ Error: No se pudo crear la factura" -ForegroundColor Red
    exit 1
}

$invoiceId = $invoiceResponse.data.invoice.id
$invoiceNumber = $invoiceResponse.data.invoice.invoice_number
Write-Host "✅ Factura creada: $invoiceNumber ($invoiceId)" -ForegroundColor Green
Write-Host ""

# =====================================================
# 7. ENVIAR FACTURA AL CLIENTE
# =====================================================
Write-Host "📧 PASO 7: Enviando factura al cliente..." -ForegroundColor Cyan

$sendBody = @{
    status = "sent"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BaseUrl/api/invoices/$invoiceId" -Method Put -Body $sendBody -ContentType "application/json" | Out-Null
Write-Host "✅ Factura enviada" -ForegroundColor Green
Write-Host ""

# =====================================================
# 8. MARCAR FACTURA COMO PAGADA
# =====================================================
Write-Host "💳 PASO 8: Marcando factura como pagada..." -ForegroundColor Cyan

$paymentBody = @{
    payment_method = "transfer"
    reference = "TRX-TEST-12345"
    notes = "Pago de prueba - Transferencia bancaria"
} | ConvertTo-Json

$paymentResponse = Invoke-RestMethod -Uri "$BaseUrl/api/invoices/$invoiceId/pay" -Method Post -Body $paymentBody -ContentType "application/json"

Write-Host ($paymentResponse | ConvertTo-Json -Depth 10) -ForegroundColor Gray
Write-Host "✅ Factura pagada" -ForegroundColor Green
Write-Host ""

# =====================================================
# 9. VERIFICAR HISTORIAL DEL VEHÍCULO
# =====================================================
Write-Host "📜 PASO 9: Verificando historial del vehículo..." -ForegroundColor Cyan

$historyResponse = Invoke-RestMethod -Uri "$BaseUrl/api/vehicles/$vehicleId/history" -Method Get
Write-Host ($historyResponse | ConvertTo-Json -Depth 10) -ForegroundColor Gray
Write-Host ""

# =====================================================
# RESUMEN FINAL
# =====================================================
Write-Host ""
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                                                ║" -ForegroundColor Green
Write-Host "║   ✅  FLUJO COMPLETO EJECUTADO                 ║" -ForegroundColor Green
Write-Host "║                                                ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "📊 RESUMEN:" -ForegroundColor Cyan
Write-Host "   • Cliente:   $customerId" -ForegroundColor White
Write-Host "   • Vehículo:  $vehicleId" -ForegroundColor White
Write-Host "   • Orden:     $orderNumber" -ForegroundColor White
Write-Host "   • Factura:   $invoiceNumber" -ForegroundColor White
Write-Host "   • Estado:    PAGADA ✅" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 PRUEBAS ADICIONALES:" -ForegroundColor Cyan
Write-Host "   Invoke-RestMethod -Uri ""$BaseUrl/api/customers/$customerId"" -Method Get" -ForegroundColor Yellow
Write-Host "   Invoke-RestMethod -Uri ""$BaseUrl/api/vehicles/$vehicleId/history"" -Method Get" -ForegroundColor Yellow
Write-Host "   Invoke-RestMethod -Uri ""$BaseUrl/api/orders/$orderId"" -Method Get" -ForegroundColor Yellow
Write-Host "   Invoke-RestMethod -Uri ""$BaseUrl/api/invoices/$invoiceId"" -Method Get" -ForegroundColor Yellow
Write-Host ""
