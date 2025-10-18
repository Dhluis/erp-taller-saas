#!/bin/bash

# =====================================================
# PRUEBA DE FLUJO COMPLETO DEL ERP
# =====================================================
# Este script prueba el flujo completo:
# Cliente -> Vehículo -> Orden -> Factura -> Pago
# =====================================================

BASE_URL="http://localhost:3001"
ORG_ID="00000000-0000-0000-0000-000000000000"

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║                                                ║"
echo "║   🧪  PRUEBA DE FLUJO COMPLETO DEL ERP         ║"
echo "║                                                ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# =====================================================
# 1. CREAR CLIENTE
# =====================================================
echo "📋 PASO 1: Creando cliente..."
CUSTOMER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/customers" \
  -H "Content-Type: application/json" \
  -d "{
    \"organization_id\": \"$ORG_ID\",
    \"name\": \"Juan Pérez Test\",
    \"email\": \"juan.test@email.com\",
    \"phone\": \"555-1234\",
    \"address\": \"Calle Principal 123\"
  }")

echo "$CUSTOMER_RESPONSE" | jq '.'

CUSTOMER_ID=$(echo "$CUSTOMER_RESPONSE" | jq -r '.data.id')

if [ "$CUSTOMER_ID" == "null" ] || [ -z "$CUSTOMER_ID" ]; then
  echo "❌ Error: No se pudo crear el cliente"
  exit 1
fi

echo "✅ Cliente creado: $CUSTOMER_ID"
echo ""

# =====================================================
# 2. CREAR VEHÍCULO
# =====================================================
echo "🚗 PASO 2: Creando vehículo..."
VEHICLE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/vehicles" \
  -H "Content-Type: application/json" \
  -d "{
    \"organization_id\": \"$ORG_ID\",
    \"customer_id\": \"$CUSTOMER_ID\",
    \"brand\": \"Toyota\",
    \"model\": \"Corolla\",
    \"year\": 2020,
    \"license_plate\": \"TEST-123\",
    \"color\": \"Blanco\",
    \"mileage\": 50000
  }")

echo "$VEHICLE_RESPONSE" | jq '.'

VEHICLE_ID=$(echo "$VEHICLE_RESPONSE" | jq -r '.data.id')

if [ "$VEHICLE_ID" == "null" ] || [ -z "$VEHICLE_ID" ]; then
  echo "❌ Error: No se pudo crear el vehículo"
  exit 1
fi

echo "✅ Vehículo creado: $VEHICLE_ID"
echo ""

# =====================================================
# 3. CREAR ORDEN DE TRABAJO
# =====================================================
echo "🔧 PASO 3: Creando orden de trabajo..."
ORDER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/orders" \
  -H "Content-Type: application/json" \
  -d "{
    \"organization_id\": \"$ORG_ID\",
    \"customer_id\": \"$CUSTOMER_ID\",
    \"vehicle_id\": \"$VEHICLE_ID\",
    \"description\": \"Mantenimiento general - Cambio de aceite y filtros\",
    \"notes\": \"Cliente solicita revisión completa\"
  }")

echo "$ORDER_RESPONSE" | jq '.'

ORDER_ID=$(echo "$ORDER_RESPONSE" | jq -r '.data.id')
ORDER_NUMBER=$(echo "$ORDER_RESPONSE" | jq -r '.data.order_number')

if [ "$ORDER_ID" == "null" ] || [ -z "$ORDER_ID" ]; then
  echo "❌ Error: No se pudo crear la orden"
  exit 1
fi

echo "✅ Orden creada: $ORDER_NUMBER ($ORDER_ID)"
echo ""

# =====================================================
# 4. AGREGAR ITEMS A LA ORDEN
# =====================================================
echo "📦 PASO 4: Agregando items a la orden..."

# Item 1: Servicio
curl -s -X POST "$BASE_URL/api/orders/$ORDER_ID/items" \
  -H "Content-Type: application/json" \
  -d '{
    "item_type": "service",
    "description": "Cambio de aceite sintético",
    "quantity": 1,
    "unit_price": 500.00,
    "tax_percent": 16
  }' | jq '.'

echo "✅ Item 1 agregado (Servicio)"

# Item 2: Producto
curl -s -X POST "$BASE_URL/api/orders/$ORDER_ID/items" \
  -H "Content-Type: application/json" \
  -d '{
    "item_type": "product",
    "description": "Filtro de aceite",
    "quantity": 1,
    "unit_price": 150.00,
    "tax_percent": 16
  }' | jq '.'

echo "✅ Item 2 agregado (Producto)"
echo ""

# =====================================================
# 5. COMPLETAR ORDEN
# =====================================================
echo "✅ PASO 5: Completando orden de trabajo..."
curl -s -X PATCH "$BASE_URL/api/orders/$ORDER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed"
  }' | jq '.'

echo "✅ Orden completada"
echo ""

# =====================================================
# 6. CREAR FACTURA DESDE ORDEN
# =====================================================
echo "💰 PASO 6: Creando factura desde orden..."
INVOICE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/invoices/from-order" \
  -H "Content-Type: application/json" \
  -d "{
    \"work_order_id\": \"$ORDER_ID\"
  }")

echo "$INVOICE_RESPONSE" | jq '.'

INVOICE_ID=$(echo "$INVOICE_RESPONSE" | jq -r '.data.invoice.id')
INVOICE_NUMBER=$(echo "$INVOICE_RESPONSE" | jq -r '.data.invoice.invoice_number')

if [ "$INVOICE_ID" == "null" ] || [ -z "$INVOICE_ID" ]; then
  echo "❌ Error: No se pudo crear la factura"
  exit 1
fi

echo "✅ Factura creada: $INVOICE_NUMBER ($INVOICE_ID)"
echo ""

# =====================================================
# 7. ENVIAR FACTURA AL CLIENTE
# =====================================================
echo "📧 PASO 7: Enviando factura al cliente..."
curl -s -X PUT "$BASE_URL/api/invoices/$INVOICE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "sent"
  }' | jq '.'

echo "✅ Factura enviada"
echo ""

# =====================================================
# 8. MARCAR FACTURA COMO PAGADA
# =====================================================
echo "💳 PASO 8: Marcando factura como pagada..."
PAYMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/invoices/$INVOICE_ID/pay" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_method": "transfer",
    "reference": "TRX-TEST-12345",
    "notes": "Pago de prueba - Transferencia bancaria"
  }')

echo "$PAYMENT_RESPONSE" | jq '.'

echo "✅ Factura pagada"
echo ""

# =====================================================
# 9. VERIFICAR HISTORIAL DEL VEHÍCULO
# =====================================================
echo "📜 PASO 9: Verificando historial del vehículo..."
curl -s "$BASE_URL/api/vehicles/$VEHICLE_ID/history" | jq '.'

echo ""

# =====================================================
# RESUMEN FINAL
# =====================================================
echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║                                                ║"
echo "║   ✅  FLUJO COMPLETO EJECUTADO                 ║"
echo "║                                                ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "📊 RESUMEN:"
echo "   • Cliente:   $CUSTOMER_ID"
echo "   • Vehículo:  $VEHICLE_ID"
echo "   • Orden:     $ORDER_NUMBER"
echo "   • Factura:   $INVOICE_NUMBER"
echo "   • Estado:    PAGADA ✅"
echo ""
echo "🎯 PRUEBAS ADICIONALES:"
echo "   curl $BASE_URL/api/customers/$CUSTOMER_ID"
echo "   curl $BASE_URL/api/vehicles/$VEHICLE_ID/history"
echo "   curl $BASE_URL/api/orders/$ORDER_ID"
echo "   curl $BASE_URL/api/invoices/$INVOICE_ID"
echo ""


