import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ADMIN_EMAIL = "admin@fusionlabs.com";
const ADMIN_PASSWORD = "Admin@12345";
const ADMIN_NAME = "Administrator";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if admin profile already exists
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ ok: true, message: "Admin account already exists", email: ADMIN_EMAIL }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up by email in auth.users
    const { data: authUser, error: listErr } = await supabase.auth.admin
      .getUserByEmail(ADMIN_EMAIL)
      .catch(() => ({ data: null, error: null }));

    let userId: string;

    if (authUser?.user) {
      // user exists, ensure profile is admin
      userId = authUser.user.id;
      await supabase
        .from("profiles")
        .upsert({ id: userId, name: ADMIN_NAME, email: ADMIN_EMAIL, role: "admin" });
    } else {
      // create the admin user with a known password
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { name: ADMIN_NAME },
      });

      if (createErr) throw createErr;
      userId = created.user.id;

      // Trigger may have already created a profile as employee; override to admin
      await supabase
        .from("profiles")
        .upsert({ id: userId, name: ADMIN_NAME, email: ADMIN_EMAIL, role: "admin" });
    }

    return new Response(
      JSON.stringify({ ok: true, message: "Admin account ready", email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err?.message || err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
