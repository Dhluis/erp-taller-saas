const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.vercel' });

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20260407000000_add_dashboard_indicators.sql');
  const sqlContent = fs.readFileSync(migrationPath, 'utf8');

  console.log('Running dashboard_indicators migration...');
  const { data, error } = await supabase.rpc('exec_sql', { query: sqlContent });

  if (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  }

  console.log('Migration applied successfully:', data);
}

runMigration();
