/**
 * seed-test-data.mjs
 * Comprehensive test data seed script for Eagles ERP
 *
 * Usage: node scripts/seed-test-data.mjs
 *
 * Connects via Supabase service role (bypasses RLS).
 * Finds the organization for hdzalfonsodigital@gmail.com and inserts
 * representative test data across all major modules.
 */

import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Configuration — read from environment or fall back to hard-coded .env values
// ---------------------------------------------------------------------------
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://igshgleciwknpupbmvhn.supabase.co';

const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnc2hnbGVjaXdrbnB1cGJtdmhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODczMjUyMCwiZXhwIjoyMDc0MzA4NTIwfQ.2lt7F9Yt-2qhg4qsxCQWktAXszoTgs6JGkdzNm_Z4yI';

const TARGET_EMAIL = 'hdzalfonsodigital@gmail.com';

// ---------------------------------------------------------------------------
// Summary counters
// ---------------------------------------------------------------------------
const summary = {
  customers: 0,
  vehicles: 0,
  appointments: 0,
  workOrders: 0,
  quotations: 0,
  salesInvoices: 0,
  inventoryItems: 0,
  inventoryCategories: 0,
  inventoryMovements: 0,
  servicePackages: 0,
  suppliers: 0,
  purchaseOrders: 0,
  leads: 0,
  expenses: 0,
  cashAccounts: 0,
  errors: [],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Insert a single row and return the inserted record.
 * On error: logs and pushes to summary.errors, returns null.
 */
async function insertOne(supabase, table, data, label) {
  const { data: result, error } = await supabase
    .from(table)
    .insert(data)
    .select()
    .single();

  if (error) {
    const msg = `[${label}] INSERT into ${table} failed: ${error.message}`;
    console.error('  ERROR:', msg);
    summary.errors.push(msg);
    return null;
  }

  return result;
}

/**
 * Insert multiple rows and return inserted records.
 * On error: logs and pushes to summary.errors, returns [].
 */
async function insertMany(supabase, table, rows, label) {
  const { data: results, error } = await supabase
    .from(table)
    .insert(rows)
    .select();

  if (error) {
    const msg = `[${label}] INSERT many into ${table} failed: ${error.message}`;
    console.error('  ERROR:', msg);
    summary.errors.push(msg);
    return [];
  }

  return results || [];
}

/**
 * Check if records already exist (by unique field).
 */
async function exists(supabase, table, field, value, orgId) {
  const query = supabase.from(table).select('id').eq(field, value);
  if (orgId) query.eq('organization_id', orgId);
  const { data } = await query.limit(1);
  return data && data.length > 0;
}

// ---------------------------------------------------------------------------
// Step 0 — Find organization_id for target user
// ---------------------------------------------------------------------------
async function findOrganizationId(supabase) {
  console.log(`\nStep 0 — Looking up organization for ${TARGET_EMAIL}...`);

  // Strategy 1: look in public.users by email
  const { data: userRow } = await supabase
    .from('users')
    .select('id, organization_id, email')
    .eq('email', TARGET_EMAIL)
    .maybeSingle();

  if (userRow?.organization_id) {
    console.log(`  Found via users table: organization_id = ${userRow.organization_id}`);
    return userRow.organization_id;
  }

  // Strategy 2: look in auth.users via admin API, then join users table
  const { data: authList } = await supabase.auth.admin.listUsers();
  const authUser = authList?.users?.find((u) => u.email === TARGET_EMAIL);

  if (authUser) {
    const { data: profileRow } = await supabase
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();

    if (profileRow?.organization_id) {
      console.log(
        `  Found via auth + users join: organization_id = ${profileRow.organization_id}`
      );
      return profileRow.organization_id;
    }
  }

  // Strategy 3: look in organizations by email
  const { data: orgByEmail } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('email', TARGET_EMAIL)
    .maybeSingle();

  if (orgByEmail?.id) {
    console.log(
      `  Found via organizations.email: organization_id = ${orgByEmail.id} (${orgByEmail.name})`
    );
    return orgByEmail.id;
  }

  throw new Error(
    `Could not find organization for ${TARGET_EMAIL}. ` +
      'Make sure the user exists in public.users or auth.users.'
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Customers
// ---------------------------------------------------------------------------
async function seedCustomers(supabase, orgId) {
  console.log('\nStep 1 — Seeding customers...');

  const customers = [
    {
      organization_id: orgId,
      name: 'Juan Carlos Hernández',
      phone: '5541234567',
      email: 'juan@test.com',
      notes: 'Cliente frecuente, pago puntual',
    },
    {
      organization_id: orgId,
      name: 'María González López',
      phone: '5598765432',
      email: 'maria@test.com',
      notes: null,
    },
    {
      organization_id: orgId,
      name: 'Roberto Silva Martínez',
      phone: '5512345678',
      email: 'roberto@test.com',
      notes: 'Conductor de Uber, requiere facturas',
    },
  ];

  const results = [];
  for (const c of customers) {
    // Avoid duplicates by email
    const alreadyExists = await exists(supabase, 'customers', 'email', c.email, orgId);
    if (alreadyExists) {
      console.log(`  Skipping existing customer: ${c.name}`);
      // Fetch and return existing record so FK links work
      const { data: existing } = await supabase
        .from('customers')
        .select('*')
        .eq('organization_id', orgId)
        .eq('email', c.email)
        .single();
      results.push(existing);
      continue;
    }

    const row = await insertOne(supabase, 'customers', c, 'customers');
    if (row) {
      results.push(row);
      summary.customers++;
      console.log(`  Created customer: ${c.name}`);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Step 2 — Vehicles
// ---------------------------------------------------------------------------
async function seedVehicles(supabase, orgId, customers) {
  console.log('\nStep 2 — Seeding vehicles...');

  if (!customers || customers.length < 3) {
    console.log('  Not enough customers to create vehicles, skipping.');
    return [];
  }

  const [juan, maria, roberto] = customers;

  const vehicleData = [
    {
      organization_id: orgId,
      customer_id: juan.id,
      brand: 'Toyota',
      model: 'Camry',
      year: 2020,
      license_plate: 'ABC123',
      vin: '1HGCM82633A123456',
      color: 'Blanco',
    },
    {
      organization_id: orgId,
      customer_id: maria.id,
      brand: 'Honda',
      model: 'Civic',
      year: 2019,
      license_plate: 'XYZ789',
      color: 'Rojo',
    },
    {
      organization_id: orgId,
      customer_id: roberto.id,
      brand: 'Nissan',
      model: 'Sentra',
      year: 2021,
      license_plate: 'DEF456',
      color: 'Gris',
    },
  ];

  const results = [];
  for (const v of vehicleData) {
    // Check for duplicate by license plate
    const alreadyExists = await exists(supabase, 'vehicles', 'license_plate', v.license_plate, null);
    if (alreadyExists) {
      console.log(`  Skipping existing vehicle: ${v.brand} ${v.model} (${v.license_plate})`);
      const { data: existing } = await supabase
        .from('vehicles')
        .select('*')
        .eq('license_plate', v.license_plate)
        .single();
      results.push(existing);
      continue;
    }

    const row = await insertOne(supabase, 'vehicles', v, 'vehicles');
    if (row) {
      results.push(row);
      summary.vehicles++;
      console.log(`  Created vehicle: ${v.brand} ${v.model} (${v.license_plate})`);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Step 3 — Appointments (Citas)
// ---------------------------------------------------------------------------
async function seedAppointments(supabase, orgId, customers, vehicles) {
  console.log('\nStep 3 — Seeding appointments...');

  if (!customers || customers.length < 2) {
    console.log('  Not enough customers for appointments, skipping.');
    return [];
  }

  const [juan, maria] = customers;
  const jVeh = vehicles?.[0] || null;
  const mVeh = vehicles?.[1] || null;

  // Dates in the future
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 3);

  const appointmentData = [
    {
      organization_id: orgId,
      customer_id: juan.id,
      vehicle_id: jVeh?.id || null,
      service_type: 'Cambio de aceite y filtros',
      appointment_date: tomorrow.toISOString(),
      duration: 60,
      status: 'scheduled',
      notes: 'Cliente solicita aceite sintético 5W30',
    },
    {
      organization_id: orgId,
      customer_id: maria.id,
      vehicle_id: mVeh?.id || null,
      service_type: 'Revisión general',
      appointment_date: dayAfter.toISOString(),
      duration: 120,
      status: 'confirmed',
      notes: 'Verificar frenos y suspensión',
    },
  ];

  const results = await insertMany(supabase, 'appointments', appointmentData, 'appointments');
  summary.appointments += results.length;
  for (const r of results) {
    console.log(`  Created appointment: ${r.service_type}`);
  }
  return results;
}

// ---------------------------------------------------------------------------
// Step 4 — Work Orders
// ---------------------------------------------------------------------------
async function seedWorkOrders(supabase, orgId, customers, vehicles) {
  console.log('\nStep 4 — Seeding work orders...');

  if (!customers || !vehicles || customers.length < 3 || vehicles.length < 3) {
    console.log('  Not enough customers/vehicles for work orders, skipping.');
    return [];
  }

  const [juan, maria, roberto] = customers;
  const [jVeh, mVeh, rVeh] = vehicles;

  const orders = [
    {
      organization_id: orgId,
      customer_id: juan.id,
      vehicle_id: jVeh.id,
      status: 'diagnosis',
      description: 'Cliente reporta vibración al acelerar y ruido en motor al arrancar en frío.',
      notes: 'Se requiere diagnóstico completo del motor',
      subtotal: 0,
      tax_amount: 0,
      discount_amount: 0,
      total_amount: 0,
    },
    {
      organization_id: orgId,
      customer_id: maria.id,
      vehicle_id: mVeh.id,
      status: 'waiting_parts',
      description: 'Cambio de pastillas de freno delanteras y traseras. Se esperan refacciones.',
      notes: 'Pastillas NGK pedidas a proveedor, llegada estimada 2 días',
      subtotal: 850,
      tax_amount: 136,
      discount_amount: 0,
      total_amount: 986,
    },
    {
      organization_id: orgId,
      customer_id: roberto.id,
      vehicle_id: rVeh.id,
      status: 'ready',
      description: 'Servicio mayor completado: aceite, filtros, bujías y alineación.',
      notes: 'Listo para entrega, cliente notificado vía WhatsApp',
      subtotal: 1800,
      tax_amount: 288,
      discount_amount: 100,
      total_amount: 1988,
    },
  ];

  const results = [];
  for (const o of orders) {
    const row = await insertOne(supabase, 'work_orders', o, 'work_orders');
    if (row) {
      results.push(row);
      summary.workOrders++;
      console.log(`  Created work order: ${row.description.substring(0, 50)}... [${row.status}]`);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Step 5 — Quotations (Cotizaciones)
// ---------------------------------------------------------------------------
async function seedQuotations(supabase, orgId, customers, vehicles, workOrders) {
  console.log('\nStep 5 — Seeding quotations...');

  if (!customers || !vehicles || customers.length < 2 || vehicles.length < 2) {
    console.log('  Not enough data for quotations, skipping.');
    return [];
  }

  const [juan, maria] = customers;
  const [jVeh, mVeh] = vehicles;

  const now = new Date();
  const validUntil = new Date();
  validUntil.setDate(now.getDate() + 30);

  const quotations = [
    {
      organization_id: orgId,
      customer_id: juan.id,
      vehicle_id: jVeh.id,
      quotation_number: `COT-${Date.now()}-001`,
      status: 'approved',
      notes: 'Diagnóstico y reparación de motor Toyota Camry 2020. Precio incluye refacciones y mano de obra',
      subtotal: 3500,
      tax_amount: 560,
      discount_amount: 0,
      total_amount: 4060,
      valid_until: validUntil.toISOString(),
    },
    {
      organization_id: orgId,
      customer_id: maria.id,
      vehicle_id: mVeh.id,
      quotation_number: `COT-${Date.now()}-002`,
      status: 'pending',
      status: 'sent',
      notes: 'Cambio de sistema de frenos completo Honda Civic 2019. En espera de aprobación del cliente',
      subtotal: 2200,
      tax_amount: 352,
      discount_amount: 200,
      total_amount: 2352,
      valid_until: validUntil.toISOString(),
    },
  ];

  const results = [];
  for (const q of quotations) {
    const row = await insertOne(supabase, 'quotations', q, 'quotations');
    if (row) {
      results.push(row);
      summary.quotations++;
      console.log(`  Created quotation: ${row.quotation_number} [${row.status}]`);

      // Add quotation items
      const items = [
        {
          organization_id: orgId,
          quotation_id: row.id,
          item_type: 'service',
          description: 'Mano de obra — Diagnóstico y reparación',
          quantity: 1,
          unit_price: 1500,
          total_amount: 1500,
        },
        {
          organization_id: orgId,
          quotation_id: row.id,
          item_type: 'product',
          description: 'Refacciones y materiales necesarios',
          quantity: 1,
          unit_price: q.subtotal - 1500 > 0 ? q.subtotal - 1500 : 500,
          total_amount: q.subtotal - 1500 > 0 ? q.subtotal - 1500 : 500,
        },
      ];

      await insertMany(supabase, 'quotation_items', items, 'quotation_items');
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Step 6 — Sales Invoices (Facturas)
// ---------------------------------------------------------------------------
async function seedSalesInvoices(supabase, orgId, customers, vehicles, workOrders) {
  console.log('\nStep 6 — Seeding sales invoices...');

  if (!customers || !vehicles || customers.length < 1 || vehicles.length < 1) {
    console.log('  Not enough data for invoices, skipping.');
    return [];
  }

  const [juan] = customers;
  const [jVeh] = vehicles;

  const now = new Date();
  const paidAt = new Date();
  paidAt.setDate(now.getDate() - 5);

  const invoiceData = {
    organization_id: orgId,
    customer_id: juan.id,
    vehicle_id: jVeh.id,
    invoice_number: `FAC-${Date.now()}-001`,
    status: 'paid',
    notes: 'Servicio de diagnóstico y reparación - Toyota Camry 2020. Pago recibido en efectivo',
    subtotal: 3500,
    tax_amount: 560,
    discount_amount: 0,
    total_amount: 4060,
    payment_method: 'cash',
    due_date: now.toISOString().split('T')[0],
    paid_date: paidAt.toISOString().split('T')[0],
  };

  const row = await insertOne(supabase, 'invoices', invoiceData, 'sales_invoices');
  if (row) {
    summary.salesInvoices++;
    console.log(`  Created sales invoice: ${row.invoice_number} [${row.status}]`);

    // Invoice items
    const invoiceItems = [
      {
        organization_id: orgId,
        invoice_id: row.id,
        description: 'Diagnóstico computarizado y análisis de motor',
        quantity: 1,
        unit_price: 800,
        total_amount: 800,
      },
      {
        organization_id: orgId,
        invoice_id: row.id,
        description: 'Mano de obra — Reparación de motor',
        quantity: 1,
        unit_price: 1500,
        total_amount: 1500,
      },
      {
        organization_id: orgId,
        invoice_id: row.id,
        description: 'Materiales y refacciones surtidas',
        quantity: 1,
        unit_price: 1200,
        total_amount: 1200,
      },
    ];

    await insertMany(supabase, 'invoice_items', invoiceItems, 'invoice_items');
    return [row];
  }

  return [];
}

// ---------------------------------------------------------------------------
// Step 7 — Inventory (Products / Productos)
// ---------------------------------------------------------------------------
async function seedInventory(supabase, orgId) {
  console.log('\nStep 7 — Seeding inventory...');

  // First, ensure a category exists (or create one)
  let categoryId = null;

  const categoryName = 'Lubricantes y Filtros';
  const { data: existingCat } = await supabase
    .from('inventory_categories')
    .select('id')
    .eq('organization_id', orgId)
    .eq('name', categoryName)
    .maybeSingle();

  if (existingCat) {
    categoryId = existingCat.id;
    console.log(`  Using existing category: ${categoryName} (${categoryId})`);
  } else {
    const catRow = await insertOne(
      supabase,
      'inventory_categories',
      {
        organization_id: orgId,
        name: categoryName,
        description: 'Aceites, lubricantes y filtros de todo tipo',
        status: 'active',
      },
      'inventory_categories'
    );
    if (catRow) {
      categoryId = catRow.id;
      summary.inventoryCategories++;
      console.log(`  Created category: ${categoryName}`);
    }
  }

  const products = [
    {
      organization_id: orgId,
      category_id: categoryId,
      name: 'Aceite Motor 5W30 Sintético',
      description: 'Aceite sintético para motor de alto rendimiento',
      sku: `SKU-ACE-5W30-${Date.now().toString().slice(-4)}`,
      unit_price: 180,
      current_stock: 50,
      min_stock: 10,
      max_stock: 100,
      unit: 'litro',
      status: 'active',
    },
    {
      organization_id: orgId,
      category_id: categoryId,
      name: 'Filtro de Aceite Universal',
      description: 'Filtro de aceite compatible con la mayoría de vehículos',
      sku: `SKU-FIL-ACE-${Date.now().toString().slice(-4)}`,
      unit_price: 85,
      current_stock: 100,
      min_stock: 20,
      max_stock: 200,
      unit: 'pieza',
      status: 'active',
    },
    {
      organization_id: orgId,
      category_id: null,
      name: 'Pastillas de Freno Delantera',
      description: 'Kit de pastillas de freno delanteras de alto rendimiento',
      sku: `SKU-PAS-FRE-${Date.now().toString().slice(-4)}`,
      unit_price: 450,
      current_stock: 30,
      min_stock: 5,
      max_stock: 60,
      unit: 'kit',
      status: 'active',
    },
    {
      organization_id: orgId,
      category_id: null,
      name: 'Bujías NGK (set 4)',
      description: 'Set de 4 bujías NGK originales para motores 4 cilindros',
      sku: `SKU-BUJ-NGK4-${Date.now().toString().slice(-4)}`,
      unit_price: 320,
      current_stock: 40,
      min_stock: 8,
      max_stock: 80,
      unit: 'set',
      status: 'active',
    },
    {
      organization_id: orgId,
      category_id: categoryId,
      name: 'Filtro de Aire',
      description: 'Filtro de aire de alta eficiencia para motores a gasolina',
      sku: `SKU-FIL-AIR-${Date.now().toString().slice(-4)}`,
      unit_price: 220,
      current_stock: 25,
      min_stock: 5,
      max_stock: 50,
      unit: 'pieza',
      status: 'active',
    },
  ];

  const results = [];
  for (const p of products) {
    const row = await insertOne(supabase, 'inventory', p, 'inventory');
    if (row) {
      results.push(row);
      summary.inventoryItems++;
      console.log(`  Created inventory item: ${p.name} (stock: ${p.current_stock})`);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Step 8 — Service Packages (Paquetes de Servicio)
// ---------------------------------------------------------------------------
async function seedServicePackages(supabase, orgId, inventoryItems) {
  console.log('\nStep 8 — Seeding service packages...');

  const packages = [
    {
      organization_id: orgId,
      name: 'Servicio Mayor',
      description: 'Cambio de aceite + filtros + revisión completa del vehículo',
      category: 'Mantenimiento',
      price: 850,
      estimated_minutes: 90,
      is_active: true,
    },
    {
      organization_id: orgId,
      name: 'Revisión de Frenos',
      description: 'Inspección del sistema de frenos + cambio de pastillas si es necesario',
      category: 'Frenos',
      price: 650,
      estimated_minutes: 60,
      is_active: true,
    },
  ];

  const results = [];
  for (const pkg of packages) {
    const row = await insertOne(supabase, 'service_packages', pkg, 'service_packages');
    if (row) {
      results.push(row);
      summary.servicePackages++;
      console.log(`  Created service package: ${pkg.name}`);

      // Link inventory items to the first package
      if (row.id && inventoryItems && inventoryItems.length > 0) {
        const pkgItems = inventoryItems.slice(0, 2).map((item) => ({
          organization_id: orgId,
          service_package_id: row.id,
          inventory_item_id: item.id,
          quantity: 1,
        }));

        const linked = await insertMany(
          supabase,
          'service_package_items',
          pkgItems,
          'service_package_items'
        );
        console.log(`    Linked ${linked.length} items to package: ${pkg.name}`);
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Step 9 — Suppliers (Proveedores)
// ---------------------------------------------------------------------------
async function seedSuppliers(supabase, orgId) {
  console.log('\nStep 9 — Seeding suppliers...');

  const suppliers = [
    {
      organization_id: orgId,
      name: 'Distribuidora Automotriz del Norte',
      company_name: 'Distribuidora Automotriz del Norte SA de CV',
      contact_name: 'Carlos Ramos',
      email: 'proveedor@dan.com',
      phone: '8001234567',
      address: 'Blvd. Industriales #500',
      city: 'Monterrey',
      state: 'Nuevo León',
      country: 'México',
      tax_id: 'DAN820101ABC',
      is_active: true,
    },
    {
      organization_id: orgId,
      name: 'Refacciones Rápidas SA',
      company_name: 'Refacciones Rápidas SA de CV',
      contact_name: 'Ana Martínez',
      email: 'ventas@refaccionesrapidas.com',
      phone: '5556789012',
      address: 'Av. Industrial #234',
      city: 'Ciudad de México',
      state: 'CDMX',
      country: 'México',
      tax_id: 'RRA910615XYZ',
      is_active: true,
    },
  ];

  const results = [];
  for (const s of suppliers) {
    // Skip if supplier with this email already exists for org
    const alreadyExists = await exists(supabase, 'suppliers', 'email', s.email, orgId);
    if (alreadyExists) {
      console.log(`  Skipping existing supplier: ${s.name}`);
      const { data: existing } = await supabase
        .from('suppliers')
        .select('*')
        .eq('organization_id', orgId)
        .eq('email', s.email)
        .single();
      results.push(existing);
      continue;
    }

    const row = await insertOne(supabase, 'suppliers', s, 'suppliers');
    if (row) {
      results.push(row);
      summary.suppliers++;
      console.log(`  Created supplier: ${s.name}`);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Step 10 — Purchase Orders (Órdenes de Compra)
// ---------------------------------------------------------------------------
async function seedPurchaseOrders(supabase, orgId, suppliers, inventoryItems) {
  console.log('\nStep 10 — Seeding purchase orders...');

  if (!suppliers || suppliers.length < 1) {
    console.log('  No suppliers available, skipping purchase orders.');
    return [];
  }

  if (!inventoryItems || inventoryItems.length < 1) {
    console.log('  No inventory items available, skipping purchase order items.');
    return [];
  }

  const [supplier] = suppliers;
  const [firstItem] = inventoryItems; // Filtro de Aceite Universal

  const orderNumber = `OC-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

  const poData = {
    organization_id: orgId,
    supplier_id: supplier.id,
    order_number: orderNumber,
    status: 'draft',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      return d.toISOString().split('T')[0];
    })(),
    subtotal: 850,
    tax_amount: 136,
    total_amount: 986,
    notes: 'Pedido de filtros de aceite para reposición de inventario',
  };

  const po = await insertOne(supabase, 'purchase_orders', poData, 'purchase_orders');
  if (!po) return [];

  summary.purchaseOrders++;
  console.log(`  Created purchase order: ${po.order_number} [${po.status}]`);

  // Purchase order items — try both schemas (migration 001 and 029 differ in columns)
  // Migration 029 uses: product_id, quantity_ordered, quantity_received, unit_cost, subtotal
  // Migration 001 uses: product_id, quantity, unit_price, total_price
  // We'll attempt the newer schema first (migration 029)
  const poItem = {
    organization_id: orgId,
    purchase_order_id: po.id,
    product_id: firstItem.id,
    quantity: 10,
    quantity_received: 0,
    unit_cost: 85,
    total_amount: 850,
    notes: 'Reposición mensual',
  };

  const { error: itemError } = await supabase.from('purchase_order_items').insert(poItem);
  if (itemError) {
    console.error(`  ERROR: Could not insert purchase order item: ${itemError.message}`);
    summary.errors.push(`purchase_order_items insert failed: ${itemError.message}`);
  } else {
    console.log(`  Created purchase order item: 10 x Filtro de Aceite Universal`);
  }

  return [po];
}

// ---------------------------------------------------------------------------
// Step 11 — CRM Leads
// ---------------------------------------------------------------------------
async function seedLeads(supabase, orgId) {
  console.log('\nStep 11 — Seeding CRM leads...');

  const now = new Date();
  const lastWeek = new Date(now);
  lastWeek.setDate(now.getDate() - 7);

  const leads = [
    {
      organization_id: orgId,
      name: 'Carlos Mendoza',
      phone: '5534567890',
      email: 'carlos.mendoza@leads.com',
      lead_source: 'whatsapp',
      status: 'new',
      estimated_value: 0,
      notes: 'Interesado en servicio de mantenimiento preventivo',
      next_follow_up: now.toISOString(),
    },
    {
      organization_id: orgId,
      name: 'Ana Torres',
      phone: '5545678901',
      email: 'ana.torres@leads.com',
      lead_source: 'referido',
      status: 'qualified',
      estimated_value: 5000,
      notes: 'Requiere diagnóstico de frenos y alineación',
      next_follow_up: lastWeek.toISOString(),
    },
    {
      organization_id: orgId,
      name: 'Luis Pérez',
      phone: '5556789012',
      email: 'luis.perez@leads.com',
      lead_source: 'facebook',
      status: 'proposal',
      estimated_value: 12000,
      notes: 'Cotización enviada para reconstrucción de motor',
      next_follow_up: now.toISOString(),
    },
    {
      organization_id: orgId,
      name: 'Elena Castro',
      phone: '5567890123',
      email: 'elena.castro@leads.com',
      lead_source: 'google',
      status: 'won',
      estimated_value: 8500,
      notes: 'Convertida en cliente — servicio mayor realizado',
    },
  ];

  const results = [];
  for (const lead of leads) {
    // Check uniqueness by email + org
    const alreadyExists = await exists(supabase, 'leads', 'email', lead.email, orgId);
    if (alreadyExists) {
      console.log(`  Skipping existing lead: ${lead.name}`);
      continue;
    }

    const row = await insertOne(supabase, 'leads', lead, 'leads');
    if (row) {
      results.push(row);
      summary.leads++;
      console.log(`  Created lead: ${lead.name} [${lead.status}]`);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Step 12 — Expenses (Gastos)
// ---------------------------------------------------------------------------
async function seedExpenses(supabase, orgId) {
  console.log('\nStep 12 — Seeding expenses...');

  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date();
  thisMonth.setDate(1);
  const firstOfMonth = thisMonth.toISOString().split('T')[0];

  const expenses = [
    {
      organization_id: orgId,
      amount: 8000,
      category: 'Renta',
      expense_date: firstOfMonth,
      description: 'Renta mensual del taller',
      payment_method: 'transfer',
      reference_type: 'operational',
    },
    {
      organization_id: orgId,
      amount: 2500,
      category: 'Servicios',
      expense_date: today,
      description: 'Servicios: luz eléctrica y agua potable',
      payment_method: 'cash',
      reference_type: 'operational',
    },
  ];

  const results = await insertMany(supabase, 'expenses', expenses, 'expenses');
  summary.expenses += results.length;
  for (const r of results) {
    console.log(`  Created expense: ${r.category} — $${r.amount} MXN`);
  }
  return results;
}

// ---------------------------------------------------------------------------
// Step 13 — Cash Account (Cuenta de Efectivo)
// ---------------------------------------------------------------------------
async function seedCashAccount(supabase, orgId) {
  console.log('\nStep 13 — Seeding cash account...');

  const existingCash = await exists(supabase, 'cash_accounts', 'name', 'Caja Principal', orgId);
  if (existingCash) {
    console.log('  Caja Principal already exists, skipping.');
    const { data: existing } = await supabase
      .from('cash_accounts')
      .select('*')
      .eq('organization_id', orgId)
      .eq('name', 'Caja Principal')
      .single();
    return existing ? [existing] : [];
  }

  const cashAccount = {
    organization_id: orgId,
    name: 'Caja Principal',
    account_number: '001',
    account_type: 'cash',
    initial_balance: 15000,
    notes: 'Cuenta principal de efectivo del taller',
    is_active: true,
  };

  const row = await insertOne(supabase, 'cash_accounts', cashAccount, 'cash_accounts');
  if (row) {
    summary.cashAccounts++;
    console.log(`  Created cash account: ${row.name} (balance: $${row.initial_balance})`);
    return [row];
  }
  return [];
}

// ---------------------------------------------------------------------------
// Step 14 — Inventory Movements
// ---------------------------------------------------------------------------
async function seedInventoryMovements(supabase, orgId, inventoryItems) {
  console.log('\nStep 14 — Seeding inventory movements...');

  if (!inventoryItems || inventoryItems.length === 0) {
    console.log('  No inventory items available, skipping movements.');
    return [];
  }

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Use only the first 3 items to avoid errors
  const itemsToMove = inventoryItems.slice(0, 3);

  const movements = [];
  for (const item of itemsToMove) {
    const prevStock = item.current_stock || 0;
    movements.push({
      organization_id: orgId,
      inventory_id: item.id,
      movement_type: 'entry',
      quantity: 20,
      unit_cost: item.unit_price || 0,
      total_cost: (item.unit_price || 0) * 20,
      previous_stock: prevStock,
      new_stock: prevStock + 20,
      reference_type: 'purchase',
      notes: `Entrada inicial de inventario — ${item.name}`,
    });
  }

  const results = await insertMany(supabase, 'inventory_movements', movements, 'inventory_movements');
  summary.inventoryMovements += results.length;
  for (const r of results) {
    console.log(`  Created inventory movement: IN +${r.quantity} for product ${r.product_id}`);
  }
  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('='.repeat(60));
  console.log('Eagles ERP — Comprehensive Test Data Seed Script');
  console.log('='.repeat(60));
  console.log(`Supabase URL : ${SUPABASE_URL}`);
  console.log(`Target user  : ${TARGET_EMAIL}`);
  console.log('='.repeat(60));

  // Create the service-role client (bypasses RLS for all operations)
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // ---- Step 0: Find org ----
  let orgId;
  try {
    orgId = await findOrganizationId(supabase);
  } catch (err) {
    console.error('\nFATAL:', err.message);
    process.exit(1);
  }

  console.log(`\nUsing organization_id: ${orgId}`);
  console.log('-'.repeat(60));

  // ---- Run all seed steps ----
  const customers = await seedCustomers(supabase, orgId);
  const vehicles = await seedVehicles(supabase, orgId, customers);
  await seedAppointments(supabase, orgId, customers, vehicles);
  const workOrders = await seedWorkOrders(supabase, orgId, customers, vehicles);
  await seedQuotations(supabase, orgId, customers, vehicles, workOrders);
  await seedSalesInvoices(supabase, orgId, customers, vehicles, workOrders);
  const inventoryItems = await seedInventory(supabase, orgId);
  await seedServicePackages(supabase, orgId, inventoryItems);
  const suppliers = await seedSuppliers(supabase, orgId);
  await seedPurchaseOrders(supabase, orgId, suppliers, inventoryItems);
  await seedLeads(supabase, orgId);
  await seedExpenses(supabase, orgId);
  await seedCashAccount(supabase, orgId);
  await seedInventoryMovements(supabase, orgId, inventoryItems);

  // ---- Summary ----
  console.log('\n' + '='.repeat(60));
  console.log('SEED COMPLETE — Summary');
  console.log('='.repeat(60));
  console.log(`Organization ID   : ${orgId}`);
  console.log(`Customers created : ${summary.customers}`);
  console.log(`Vehicles created  : ${summary.vehicles}`);
  console.log(`Appointments      : ${summary.appointments}`);
  console.log(`Work Orders       : ${summary.workOrders}`);
  console.log(`Quotations        : ${summary.quotations}`);
  console.log(`Sales Invoices    : ${summary.salesInvoices}`);
  console.log(`Inventory Items   : ${summary.inventoryItems}`);
  console.log(`Inv. Categories   : ${summary.inventoryCategories}`);
  console.log(`Inv. Movements    : ${summary.inventoryMovements}`);
  console.log(`Service Packages  : ${summary.servicePackages}`);
  console.log(`Suppliers         : ${summary.suppliers}`);
  console.log(`Purchase Orders   : ${summary.purchaseOrders}`);
  console.log(`CRM Leads         : ${summary.leads}`);
  console.log(`Expenses          : ${summary.expenses}`);
  console.log(`Cash Accounts     : ${summary.cashAccounts}`);

  if (summary.errors.length > 0) {
    console.log(`\nErrors (${summary.errors.length}):`);
    summary.errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  } else {
    console.log('\nNo errors encountered.');
  }

  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
