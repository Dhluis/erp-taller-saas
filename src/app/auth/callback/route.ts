import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/dashboard";

  console.log("🔄 [Callback] Iniciando procesamiento...", {
    hasCode: !!code,
    hasTokenHash: !!token_hash,
    type,
    next,
    fullUrl: request.url,
  });

  // ✅ Verificar PRIMERO si es recovery
  const isRecovery = type === "recovery";

  // Crear respuesta temporal (se modificará según el caso después de verificar)
  let response = NextResponse.next();

  // Cliente SSR para manejar la autenticación (con cookies)
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // ✅ Establecer cookie tanto en request como en response
          request.cookies.set({ name, value, ...options });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          // ✅ Eliminar cookie tanto de request como de response
          request.cookies.set({ name, value: "", ...options });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  // Cliente Admin para queries que bypasean RLS (solo para verificar perfil)
  // Si no hay service role key, usaremos el anon key (puede fallar con RLS estricto)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAdmin = serviceRoleKey
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

  if (!serviceRoleKey) {
    console.warn(
      "⚠️ [Callback] SUPABASE_SERVICE_ROLE_KEY no disponible, usando anon key",
    );
  }

  // Función helper para verificar si el usuario tiene organización (con retry y vinculación automática)
  async function checkUserOrganization(
    userId: string,
    userEmail?: string,
  ): Promise<string | null> {
    console.log(
      "🔍 [Callback] Verificando organización para usuario:",
      userId,
      "email:",
      userEmail,
    );

    // ✅ Resiliencia: Usar el cliente admin si está disponible, sino usar el cliente auth (RLS activo)
    const client = (supabaseAdmin || supabaseAuth) as any;
    const clientType = supabaseAdmin ? "admin" : "auth";

    console.log(
      `📋 [Callback] Usando cliente ${clientType} para verificar perfil`,
    );

    // ✅ Retry hasta 3 veces con delay de 500ms entre intentos
    const maxRetries = 3;
    const retryDelay = 500;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 1. Intentar buscar en tabla 'users' por auth_user_id o id
        console.log(
          `🔍 [Callback] Intento ${attempt}/${maxRetries} - Buscando en 'users'...`,
        );
        let { data: profile, error: profileError } = await client
          .from("users")
          .select("organization_id, auth_user_id, email")
          .or(`auth_user_id.eq.${userId},id.eq.${userId}`)
          .maybeSingle();

        console.log("📋 [Callback] Resultado 'users' por auth_id:", {
          found: !!profile,
          email: profile?.email,
          orgId: profile?.organization_id,
          authUserId: profile?.auth_user_id,
          error: profileError?.message,
        });

        if (!profileError && profile?.organization_id) {
          // Verificar si el auth_user_id coincide, si no intentar actualizarlo
          if (profile.auth_user_id !== userId) {
            console.log(
              "🔄 [Callback] auth_user_id diferente, actualizando...",
            );
            await client
              .from("users")
              .update({ auth_user_id: userId })
              .eq("id", profile.id);
          }
          console.log(
            `✅ [Callback] Organización encontrada en 'users':`,
            profile.organization_id,
          );
          return profile.organization_id;
        }

        // 1b. Buscar en 'users' por email
        if (userEmail) {
          console.log(
            `🔍 [Callback] Buscando en 'users' por email: "${userEmail}"...`,
          );
          const { data: profileByEmail } = await client
            .from("users")
            .select("organization_id, auth_user_id, id, email")
            .ilike("email", userEmail)
            .maybeSingle();

          console.log("📋 [Callback] Resultado 'users' por email:", {
            found: !!profileByEmail,
            email: profileByEmail?.email,
            orgId: profileByEmail?.organization_id,
            authUserId: profileByEmail?.auth_user_id,
          });

          if (profileByEmail?.organization_id) {
            // Actualizar auth_user_id si es diferente
            if (profileByEmail.auth_user_id !== userId && profileByEmail.id) {
              console.log(
                "🔄 [Callback] Actualizando auth_user_id en users...",
              );
              await client
                .from("users")
                .update({ auth_user_id: userId })
                .eq("id", profileByEmail.id);
            }
            return profileByEmail.organization_id;
          }
        }

        // 2. Buscar por email en 'system_users' (CRÍTICO - busca por email primero)
        if (userEmail) {
          console.log(
            `🔍 [Callback] Intento ${attempt}/${maxRetries} - Buscando en 'system_users' por email: "${userEmail}"`,
          );

          // Buscar con case insensitive (ilike)
          const { data: systemUserByEmail, error: systemByEmailError } =
            await client
              .from("system_users")
              .select("id, organization_id, auth_user_id, email")
              .ilike("email", userEmail)
              .maybeSingle();

          console.log("📋 [Callback] Resultado system_users por email:", {
            found: !!systemUserByEmail,
            email: systemUserByEmail?.email,
            id: systemUserByEmail?.id,
            orgId: systemUserByEmail?.organization_id,
            authUserId: systemUserByEmail?.auth_user_id,
            error: systemByEmailError?.message,
          });

          if (systemUserByEmail?.organization_id) {
            console.log(
              `✅ [Callback] Usuario encontrado en 'system_users' por email:`,
              systemUserByEmail.organization_id,
            );

            // Si el auth_user_id es diferente, actualizarlo (vincular nueva cuenta Google)
            if (systemUserByEmail.auth_user_id !== userId) {
              console.log(
                "🔄 [Callback] Vinculando nueva cuenta Google con usuario existente...",
              );
              await client
                .from("system_users")
                .update({ auth_user_id: userId })
                .eq("id", systemUserByEmail.id);
              console.log("✅ [Callback] Cuenta vinculada exitosamente");
            }

            return systemUserByEmail.organization_id;
          }
        }

        // 3. Intentar buscar en tabla 'system_users' por auth_user_id
        console.log(
          `🔍 [Callback] Intento ${attempt}/${maxRetries} - Buscando en 'system_users' por auth_user_id...`,
        );
        const { data: systemUser, error: systemError } = await client
          .from("system_users")
          .select("organization_id")
          .eq("auth_user_id", userId)
          .maybeSingle();

        if (!systemError && systemUser?.organization_id) {
          console.log(
            `✅ [Callback] Organización encontrada en 'system_users' por auth_user_id:`,
            systemUser.organization_id,
          );
          return systemUser.organization_id;
        }

        // Si no encontramos nada después de este intento, esperar antes del siguiente
        if (attempt < maxRetries) {
          console.log(
            `⏳ [Callback] Perfil no encontrado, reintentando en ${retryDelay}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      } catch (err: any) {
        console.error(
          `❌ [Callback] Excepción en intento ${attempt}:`,
          err.message,
        );
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }

    return null;
  }

  // Función helper para crear respuesta de redirección con cookies
  function createRedirectResponse(
    url: string,
    sourceResponse?: NextResponse,
  ): NextResponse {
    const redirectResponse = NextResponse.redirect(new URL(url, origin));

    // ✅ CRÍTICO: Copiar TODAS las cookies de sesión con TODAS sus opciones
    if (sourceResponse) {
      sourceResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, {
          path: cookie.path || "/",
          domain: cookie.domain,
          maxAge: cookie.maxAge,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure ?? process.env.NODE_ENV === "production",
          sameSite: (cookie.sameSite as any) || "lax",
        });
      });
    }

    // ✅ También copiar cookies del request (si las hay)
    request.cookies.getAll().forEach((cookie) => {
      // Solo copiar si no existe ya en la respuesta
      if (!redirectResponse.cookies.get(cookie.name)) {
        redirectResponse.cookies.set(cookie.name, cookie.value, {
          path: "/",
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        });
      }
    });

    return redirectResponse;
  }

  // Manejar código de autorización (OAuth)
  if (code) {
    console.log(
      "🚀🚀🚀 [Callback] INICIO - Código recibido, procesando OAuth...",
    );
    console.log("📌 [Callback] Código presente:", !!code);
    console.log("📌 [Callback] Service Role disponible:", !!serviceRoleKey);

    const { data, error } =
      await supabaseAuth.auth.exchangeCodeForSession(code);

    console.log(
      "📌 [Callback] Exchange result - error:",
      error?.message,
      "hasData:",
      !!data?.session,
    );

    if (!error && data?.session) {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("✅ [Callback] OAuth exitoso, sesión establecida");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("User ID:", data.session.user.id);
      console.log("Email:", data.session.user.email);
      console.log("Session exists:", !!data.session);
      console.log("Access token exists:", !!data.session.access_token);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      // ✅ IMPORTANTE: Forzar refresco de cookies antes de continuar
      // Asegurar que las cookies de sesión estén establecidas correctamente
      const sessionCheck = await supabaseAuth.auth.getSession();
      console.log("🍪 [Callback] Sesión verificada después de exchangeCode:", {
        hasSession: !!sessionCheck.data.session,
        userId: sessionCheck.data.session?.user.id,
      });

      // Verificar si el usuario tiene organización
      const organizationId = await checkUserOrganization(
        data.session.user.id,
        data.session.user.email,
      );

      // Si el usuario OAuth no tiene organización, debe crear su cuenta primero
      // Cerrar sesión y redirigir al login con mensaje claro
      if (!organizationId) {
        console.warn(
          "⚠️ [Callback] Usuario OAuth sin organización - debe crear cuenta primero",
        );
        console.warn(
          "⚠️ [Callback] Email del usuario:",
          data.session.user.email,
        );
        console.warn("⚠️ [Callback] User ID:", data.session.user.id);

        // NO cerrar sesión inmediatamente - mantener la sesión para que el usuario pueda registrarse
        // Solo redirigir al registro con el email pre-llenado

        // Redirigir al registro con mensaje claro
        const registerUrl = new URL("/auth/register", origin);
        registerUrl.searchParams.set("email", data.session.user.email || "");
        registerUrl.searchParams.set(
          "message",
          "Para usar Google como método de inicio de sesión, primero debes crear tu cuenta. Completa el registro con tu email.",
        );
        registerUrl.searchParams.set("from", "oauth");

        const redirectResponse = NextResponse.redirect(registerUrl);
        console.log(
          "🔄 [Callback] Redirigiendo al registro porque usuario no tiene organización",
        );
        return redirectResponse;
      }

      console.log(
        "✅ [Callback] Usuario con organización válida. Redirigiendo...",
      );
      // NO intentamos crear el perfil aquí - /api/users/me lo maneja buscando en system_users
      console.log("✅ [Callback] Redirigiendo a:", next);

      // ✅ FIX: Agregar parámetro para indicar que viene de OAuth callback
      const redirectUrl = new URL(next, origin);
      redirectUrl.searchParams.set("oauth_callback", "true");

      // ✅ CRÍTICO: Usar createRedirectResponse que copia las cookies correctamente
      // Esto asegura que todas las cookies de sesión se transfieran al redirect
      const redirectResponse = createRedirectResponse(
        redirectUrl.toString(),
        response,
      );

      console.log(
        "🍪 [Callback] Redirigiendo con cookies de sesión a:",
        redirectUrl.toString(),
      );
      return redirectResponse;
    } else if (error) {
      console.error("❌ [Callback] Error en OAuth:", error);
    }
  }

  // Manejar token_hash (email confirmation, magic link, recovery, etc.)
  if (token_hash && type) {
    console.log("🔄 [Callback] Procesando token de confirmación...", {
      type,
      token_hash: token_hash.substring(0, 10) + "...",
    });

    try {
      const { data, error } = await supabaseAuth.auth.verifyOtp({
        token_hash,
        type: type as any,
      });

      if (!error && data?.session) {
        console.log("✅ [Callback] Token verificado exitosamente:", {
          userId: data.session.user.id,
          email: data.session.user.email,
          sessionExists: !!data.session,
          type,
        });

        // ✅ Si es tipo 'recovery', redirigir a reset-password (NO al dashboard)
        if (type === "recovery" || isRecovery) {
          console.log(
            "🔄 [Callback] Tipo recovery detectado después de verificar token, redirigiendo a reset-password",
          );
          const resetPasswordUrl = new URL("/auth/reset-password", origin);

          // Crear respuesta de redirección
          const resetResponse = NextResponse.redirect(resetPasswordUrl);

          // Copiar todas las cookies de sesión establecidas por verifyOtp
          // Las cookies ya están en response.cookies, copiarlas a resetResponse
          response.cookies.getAll().forEach((cookie) => {
            resetResponse.cookies.set(cookie.name, cookie.value, {
              path: cookie.path,
              domain: cookie.domain,
              maxAge: cookie.maxAge,
              httpOnly: cookie.httpOnly,
              secure: cookie.secure,
              sameSite: cookie.sameSite as any,
            });
          });

          console.log(
            "✅ [Callback] Redirigiendo a reset-password con cookies de sesión",
          );
          return resetResponse;
        }

        // Para otros tipos (email confirmation, etc.)
        // Verificar si el usuario tiene organización
        const organizationId = await checkUserOrganization(
          data.session.user.id,
          data.session.user.email,
        );

        // Si no tiene organización, debe completar el registro primero
        if (!organizationId) {
          console.warn(
            "⚠️ [Callback] Usuario sin organización - debe completar registro",
          );
          // Redirigir a registro para completar la información necesaria
          const registerUrl = new URL("/auth/register", origin);
          registerUrl.searchParams.set("email", data.session.user.email || "");
          registerUrl.searchParams.set(
            "message",
            "Por favor completa tu registro para continuar",
          );
          return NextResponse.redirect(registerUrl);
        }

        // ✅ Email confirmado exitosamente, redirigir al destino
        console.log(
          "✅ [Callback] Usuario con organización, redirigiendo a:",
          next,
        );
        // Redirigir al dashboard
        const redirectUrl = new URL(next, origin);
        const redirectResponse = createRedirectResponse(
          redirectUrl.toString(),
          response,
        );
        return redirectResponse;
      } else if (error) {
        console.error("❌ [Callback] Error verificando token:", {
          message: error.message,
          status: error.status,
          name: error.name,
        });
        // Redirigir al login con mensaje de error
        const loginUrl = new URL("/auth/login", origin);
        loginUrl.searchParams.set("error", "invalid_token");
        loginUrl.searchParams.set(
          "message",
          "El enlace de confirmación es inválido o ha expirado.",
        );
        return NextResponse.redirect(loginUrl);
      } else {
        console.error("❌ [Callback] Verificación exitosa pero sin sesión");
      }
    } catch (err: any) {
      console.error("❌ [Callback] Excepción verificando token:", {
        message: err.message,
        stack: err.stack,
      });
      const loginUrl = new URL("/auth/login", origin);
      loginUrl.searchParams.set("error", "token_error");
      loginUrl.searchParams.set(
        "message",
        "Error al procesar el enlace de confirmación.",
      );
      return NextResponse.redirect(loginUrl);
    }
  }

  // Si hay error o no hay código/token, redirigir al login
  console.log("⚠️ [Callback] No hay código ni token, redirigiendo al login");
  const loginUrl = new URL("/auth/login", origin);
  if (code || token_hash) {
    loginUrl.searchParams.set("error", "auth_failed");
    loginUrl.searchParams.set(
      "message",
      "No se pudo completar la autenticación.",
    );
  }
  return NextResponse.redirect(loginUrl);
}
