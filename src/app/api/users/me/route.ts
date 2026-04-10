import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseServiceClient,
  createClientFromRequest,
} from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    console.log("[GET /api/users/me] Iniciando...");

    // Obtener usuario autenticado
    const supabase = createClientFromRequest(request);
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = authUser.id;
    console.log("[GET /api/users/me] userId:", userId);

    // Cliente admin (Service Role) si está disponible
    const serviceClient = getSupabaseServiceClient();
    const queryClient = serviceClient || supabase;

    // 1. Buscar en tabla 'users' (perfil principal)
    console.log("[GET /api/users/me] Buscando en tabla 'users'...");
    const { data: userProfile } = await queryClient
      .from("users")
      .select("*")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (userProfile) {
      console.log("[GET /api/users/me] ✅ Perfil encontrado en tabla 'users'");
      return buildSuccessResponse(userProfile, queryClient);
    }

    // 2. Buscar en tabla 'system_users' (legacy/admin)
    console.log("[GET /api/users/me] Buscando en tabla 'system_users'...");
    const { data: systemUser } = await queryClient
      .from("system_users")
      .select("*")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (systemUser) {
      console.log(
        "[GET /api/users/me] ✅ Perfil encontrado en tabla 'system_users'",
      );

      // Mapear al formato de users
      const mappedProfile = {
        id: systemUser.id,
        auth_user_id: systemUser.auth_user_id,
        email: systemUser.email,
        full_name:
          `${systemUser.first_name || ""} ${systemUser.last_name || ""}`.trim() ||
          systemUser.email?.split("@")[0] ||
          "Usuario",
        role: systemUser.role || "ADMIN",
        phone: systemUser.phone || null,
        is_active: systemUser.is_active ?? true,
        organization_id: systemUser.organization_id,
        workshop_id: systemUser.workshop_id || null,
        created_at: systemUser.created_at,
        updated_at: systemUser.updated_at,
        avatar_url: systemUser.avatar_url || null,
      };

      return buildSuccessResponse(mappedProfile, queryClient);
    }

    // 3. Buscar por email en system_users (vinculación legacy)
    console.log("[GET /api/users/me] Buscando por email en 'system_users'...");
    const { data: systemUserByEmail } = await queryClient
      .from("system_users")
      .select("*")
      .eq("email", authUser.email || "")
      .maybeSingle();

    if (systemUserByEmail) {
      console.log("[GET /api/users/me] ✅ Perfil encontrado por email");

      const mappedProfile = {
        id: systemUserByEmail.id,
        auth_user_id: authUser.id,
        email: systemUserByEmail.email,
        full_name:
          `${systemUserByEmail.first_name || ""} ${systemUserByEmail.last_name || ""}`.trim() ||
          authUser.email?.split("@")[0] ||
          "Usuario",
        role: systemUserByEmail.role || "ADMIN",
        phone: systemUserByEmail.phone || null,
        is_active: systemUserByEmail.is_active ?? true,
        organization_id: systemUserByEmail.organization_id,
        workshop_id: systemUserByEmail.workshop_id || null,
        created_at: systemUserByEmail.created_at,
        updated_at: systemUserByEmail.updated_at,
        avatar_url: systemUserByEmail.avatar_url || null,
      };

      return buildSuccessResponse(mappedProfile, queryClient);
    }

    // 4. Si no tiene organización en metadata, buscar por email en organizations
    const userMetadata = authUser.user_metadata || {};
    const orgIdFromMeta = userMetadata.organization_id;

    if (orgIdFromMeta) {
      console.log(
        "[GET /api/users/me] Usuario tiene organization_id en metadata:",
        orgIdFromMeta,
      );

      const mappedProfile = {
        id: userId,
        auth_user_id: userId,
        email: authUser.email,
        full_name:
          userMetadata.full_name || authUser.email?.split("@")[0] || "Usuario",
        role: userMetadata.role || "ADMIN",
        phone: userMetadata.phone || null,
        is_active: true,
        organization_id: orgIdFromMeta,
        workshop_id: userMetadata.workshop_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        avatar_url: null,
      };

      return buildSuccessResponse(mappedProfile, queryClient);
    }

    // 5. No se encontró en ningún lado
    console.error(
      "[GET /api/users/me] ❌ Usuario no encontrado en ninguna tabla",
    );
    return NextResponse.json(
      { error: "Usuario no encontrado. Por favor completa tu registro." },
      { status: 404 },
    );
  } catch (error: any) {
    console.error("[GET /api/users/me] Error:", error);
    return NextResponse.json(
      { error: error.message || "Error interno" },
      { status: 500 },
    );
  }
}

async function buildSuccessResponse(profile: any, client: any) {
  const user = {
    ...profile,
    name: profile.full_name || "",
  };

  // Obtener workshops
  let workshops: any[] = [];
  let companySettings: any = null;

  if (user.organization_id) {
    const { data: workshopsData } = await client
      .from("workshops")
      .select("id, name")
      .eq("organization_id", user.organization_id)
      .order("created_at", { ascending: true });
    workshops = workshopsData || [];

    const { data: settingsData } = await client
      .from("company_settings")
      .select("*")
      .eq("organization_id", user.organization_id)
      .maybeSingle();
    companySettings = settingsData;
  }

  console.log("[GET /api/users/me] ✅ Respuesta exitosa para:", user.email);

  return NextResponse.json({
    profile: user,
    workshops,
    companySettings,
  });
}
