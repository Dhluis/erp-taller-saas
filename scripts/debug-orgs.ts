import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getSupabaseServiceClient } from '../src/lib/supabase/server';

async function debugOrganizations() {
  const supabase = getSupabaseServiceClient();
  
  console.log('--- Buscando tablas de usuarios ---');
  
  // Intento manual
  const { count: usersCount } = await supabase.from('users').select('id', { count: 'exact', head: true });
  console.log(`Tabla 'users': ${usersCount !== null ? 'Existe' : 'No existe'}`);

  const { count: profilesCount } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
  console.log(`Tabla 'profiles': ${profilesCount !== null ? 'Existe' : 'No existe'}`);

  const { count: systemUsersCount } = await supabase.from('system_users').select('id', { count: 'exact', head: true });
  console.log(`Tabla 'system_users': ${systemUsersCount !== null ? 'Existe' : 'No existe'}`);

  console.log('\n--- Muestreo de Usuarios (posibles conflictos) ---');
  const { data: sampleUsers } = await supabase
    .from('users')
    .select('id, auth_user_id, email, organization_id, workshop_id')
    .limit(5);
  console.table(sampleUsers);

  console.log('\n--- Buscando "araiza" ---');
  const { data: araiza } = await supabase
    .from('users')
    .select('id, auth_user_id, email, organization_id')
    .ilike('email', '%araiza%');
  console.table(araiza);
}

debugOrganizations().catch(console.error);
