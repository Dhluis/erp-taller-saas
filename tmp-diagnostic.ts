import { Database } from './src/types/supabase-simple';

type Tables = keyof Database['public']['Tables'];
const table: Tables = 'system_users';
console.log('Table exists:', table);
