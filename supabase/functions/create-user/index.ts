
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  password: string;
  username: string;
  role: "admin" | "clerk" | "public";
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create admin client using service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { email, password, username, role }: CreateUserRequest = await req.json();

    // Validate input
    if (!email || !password || !username || !role) {
      throw new Error("Missing required fields");
    }

    if (!["admin", "clerk", "public"].includes(role)) {
      throw new Error("Invalid role");
    }

    // Create user in auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username: username
      }
    });

    if (authError) {
      throw authError;
    }

    if (!authUser.user) {
      throw new Error("Failed to create user");
    }

    // Update the user's profile with the correct role
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ role, username })
      .eq("id", authUser.user.id);

    if (profileError) {
      // If profile update fails, we should clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      throw profileError;
    }

    return new Response(
      JSON.stringify({ 
        message: "User created successfully",
        user: {
          id: authUser.user.id,
          email,
          username,
          role
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error) {
    console.error("Error creating user:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
