import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getSupabaseServiceClient } from '../src/lib/supabase/server';

async function setup() {
  const supabase = getSupabaseServiceClient();
  
  // 1. Obtener Organization
  const { data: orgs } = await supabase.from('organizations').select('id, name').limit(1);
  if (!orgs || orgs.length === 0) {
    console.error('No se encontró organización');
    return;
  }
  const orgId = orgs[0].id;
  console.log(`Usando organización: ${orgs[0].name} (${orgId})`);

  // 2. Crear/Verificar Categoría
  const { data: cat } = await supabase
    .from('inventory_categories')
    .select('id')
    .eq('name', 'Motor')
    .eq('organization_id', orgId)
    .maybeSingle();
  
  let categoryId = cat?.id;
  if (!categoryId) {
    const { data: newCat, error: catErr } = await supabase
      .from('inventory_categories')
      .insert({ name: 'Motor', organization_id: orgId })
      .select()
      .single();
    if (catErr) {
      console.error('Error creando categoría:', catErr);
      return;
    }
    categoryId = newCat.id;
    console.log('Categoría "Motor" creada.');
  }

  // 3. Crear Producto (Aceite)
  const { data: prod } = await supabase
    .from('inventory')
    .select('id')
    .eq('sku', 'OIL-5W30-TEST')
    .eq('organization_id', orgId)
    .maybeSingle();

  let productId = prod?.id;
  if (!productId) {
    const { data: newProd, error: prodErr } = await supabase
      .from('inventory')
      .insert({
        organization_id: orgId,
        category_id: categoryId,
        name: 'Aceite Sintético 5W-30 (Prueba)',
        sku: 'OIL-5W30-TEST',
        unit_price: 150,
        current_stock: 20,
        min_quantity: 5,
        unit: 'Litros'
      })
      .select()
      .single();
    if (prodErr) {
      console.error('Error creando producto:', prodErr);
      return;
    }
    productId = newProd.id;
    console.log('Producto "Aceite Sintético" creado con 20 litros.');
  } else {
    // Asegurar que tenga stock
    await supabase.from('inventory').update({ current_stock: 20 }).eq('id', productId);
    console.log('Producto existente actualizado a 20 litros.');
  }

  // 4. Crear Paquete de Servicio
  const { data: pkg } = await supabase
    .from('service_packages')
    .select('id')
    .eq('name', 'Cambio de Aceite Premium (Demo AI)')
    .eq('organization_id', orgId)
    .maybeSingle();

  let packageId = pkg?.id;
  if (!packageId) {
    const { data: newPkg, error: pkgErr } = await supabase
      .from('service_packages')
      .insert({
        organization_id: orgId,
        name: 'Cambio de Aceite Premium (Demo AI)',
        description: 'Servicio completo con aceite sintético y revisión de puntos',
        price: 1200,
        category: 'Motor',
        estimated_minutes: 45
      })
      .select()
      .single();
    if (pkgErr) {
      console.error('Error creando paquete:', pkgErr);
      return;
    }
    packageId = newPkg.id;
    console.log('Paquete "Cambio de Aceite Premium" creado.');

    // 5. Vincular Producto al Paquete (Receta)
    const { error: itemErr } = await supabase
      .from('service_package_items')
      .insert({
        organization_id: orgId,
        service_package_id: packageId,
        inventory_item_id: productId,
        quantity: 4
      });
    if (itemErr) {
      console.error('Error vinculando producto al paquete:', itemErr);
    } else {
      console.log('Receta configurada: 4 litros vinculados al paquete.');
    }
  }

  console.log('--------------------------------------------------');
  console.log('TODO LISTO PARA LA PRUEBA');
  console.log('Producto: OIL-5W30-TEST (Stock: 20)');
  console.log('Paquete: Cambio de Aceite Premium (Demo AI)');
  console.log('--------------------------------------------------');
}

setup();
