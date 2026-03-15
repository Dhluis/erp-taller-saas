
import { getSupabaseServiceClient } from './src/lib/supabase/server'

async function diagnostic() {
  const supabase = getSupabaseServiceClient()
  const email = 'hdzalfonsodigital@gmail.com'

  console.log(`--- Diagnostic for ${email} ---`)

  // 1. Check user in auth
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
  if (authError) {
    console.error('Error listing auth users:', authError)
    return
  }

  const authUser = authUsers.users.find(u => u.email === email)
  if (!authUser) {
    console.log('User not found in auth.')
    return
  }

  console.log('Auth User ID:', authUser.id)
  console.log('Auth Metadata:', authUser.user_metadata)

  // 2. Check user in 'users' table
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', authUser.id)
    .single()

  if (profileError) {
    console.warn('Profile not found in users table:', profileError.message)
  } else {
    console.log('Profile Org ID:', profile.organization_id)
    console.log('Profile details:', profile)
  }

  // 3. Check organization
  if (profile?.organization_id) {
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profile.organization_id)
      .single()

    if (orgError) {
      console.error('Organization not found:', orgError.message)
    } else {
      console.log('Organization Name:', org.name)
      console.log('Organization Created At:', org.created_at)
    }

    // 4. Check Leads and Customers count for this org
    const { count: leadCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', profile.organization_id)

    const { count: customerCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', profile.organization_id)

    console.log(`Leads count: ${leadCount}`)
    console.log(`Customers count: ${customerCount}`)
  }
  // 5. Check if there are other organizations for this email
  const { data: allOrgs, error: allOrgsError } = await supabase
    .from('organizations')
    .select('id, name, email')
    .eq('email', email)
  
  console.log(`Organizations found for ${email}:`, allOrgs?.length || 0)
  allOrgs?.forEach(o => console.log(` - ${o.name} (${o.id})`))

  // 6. Check if there are multiple users with same email in 'users'
  const { data: allUsers, error: allUsersError } = await supabase
    .from('users')
    .select('id, auth_user_id, organization_id, email')
    .eq('email', email)

  console.log(`Users found in 'users' table for ${email}:`, allUsers?.length || 0)
  allUsers?.forEach(u => console.log(` - User ID: ${u.id}, Org ID: ${u.organization_id}`))
  // 7. Check user_profiles table
  const { data: userProfile, error: userProfileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle()

  if (userProfileError) {
    console.error('Error in user_profiles:', userProfileError.message)
  } else {
    console.log('User Profile in user_profiles:', userProfile ? 'Found' : 'NOT FOUND')
    if (userProfile) console.log(' - Org ID in user_profiles:', userProfile.organization_id)
  }

  // 8. Check system_users table columns
  const { data: systemUserCols, error: systemUserColsError } = await supabase
    .rpc('get_table_columns', { table_name: 'system_users' }) // Some projects have this RPC

  // Fallback: check columns via query if RPC fails
  if (systemUserColsError) {
     const { data: systemUserCheck, error: systemUserCheckError } = await supabase
       .from('system_users')
       .select('*')
       .limit(1)
     
     if (systemUserCheckError) {
       console.error('Error in system_users:', systemUserCheckError.message)
     } else {
       console.log('User in system_users found via select *')
       if (systemUserCheck) console.log('Columns in system_users:', Object.keys(systemUserCheck))
     }
  } else {
    console.log('Columns in system_users:', systemUserCols)
  }
}

diagnostic().catch(console.error)
