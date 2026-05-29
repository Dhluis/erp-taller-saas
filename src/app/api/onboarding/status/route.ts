import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/core/multi-tenant-server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext(request);
    if (!tenantContext?.organizationId) {
      return NextResponse.json({ completed: false }, { status: 200 });
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ completed: false }, { status: 200 });
    }

    const { data } = await (supabase
      .from('organizations')
      .select('onboarding_completed')
      .eq('id', tenantContext.organizationId)
      .single() as any);

    return NextResponse.json({ completed: !!data?.onboarding_completed });
  } catch {
    return NextResponse.json({ completed: false }, { status: 200 });
  }
}
