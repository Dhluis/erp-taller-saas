
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getSupabaseServiceClient } from '../src/lib/supabase/server';

async function verifyOrgs() {
  const supabase = getSupabaseServiceClient();
  
  console.log('--- Verificando usuarios y sus organizaciones ---');
  const emails = ['araizaeagles@gmail.com', 'jonathan.araiza2023@gmail.com'];
  
  const { data: users } = await supabase
    .from('users')
    .select('email, organization_id, auth_user_id')
    .in('email', emails);

  if (!users) {
     console.log('No se encontraron usuarios');
     return;
  }

  for (const user of users) {
    console.log(`\nUsuario: ${user.email}`);
    console.log(`Org ID: ${user.organization_id}`);
    
    if (user.organization_id) {
        const { data: org, error } = await supabase
            .from('organizations')
            .select('id, name')
            .eq('id', user.organization_id)
            .maybeSingle();
            
        if (org) {
            console.log(`✅ Organización encontrada: ${org.name} (${org.id})`);
        } else {
            console.log(`❌ Organización NO encontrada en tabla 'organizations'!`);
        }
    } else {
        console.log('⚠️ El usuario no tiene organization_id asignado.');
    }
  }
}

verifyOrgs().catch(console.error);
