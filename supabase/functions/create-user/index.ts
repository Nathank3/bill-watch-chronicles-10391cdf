
import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";

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

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header is required' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401 
      });
    }

    // Verify the current user is an admin
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: currentUser }, error: userError } = await userClient.auth.getUser();

    if (userError || !currentUser) {
      return new Response(JSON.stringify({ error: 'Authentication failed' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401 
      });
    }

    // Check if the current user has admin role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized. Only admins can create users.' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403 
      });
    }

    const { email, password, username, role }: CreateUserRequest = await req.json();

    // Enhanced input validation
    if (!email || !password || !username || !role) {
      throw new Error("Missing required fields");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }

    // Validate role
    if (!["admin", "clerk", "public"].includes(role)) {
      throw new Error("Invalid role");
    }

    // Validate password strength
    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }

    // Validate username (no empty strings, reasonable length)
    if (username.trim().length === 0 || username.length > 50) {
      throw new Error("Username must be between 1 and 50 characters");
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
      // Handle specific error cases
      if (authError.message.includes("already been registered") || authError.message.includes("email_exists")) {
        return new Response(
          JSON.stringify({ error: "A user with this email address already exists. Please use a different email address." }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      throw authError;
    }

    if (!authUser.user) {
      throw new Error("Failed to create user");
    }

    // Update the user's profile with the correct role
    const { error: createProfileError } = await supabaseAdmin
      .from("profiles")
      .update({ role, username })
      .eq("id", authUser.user.id);

    if (createProfileError) {
      // If profile update fails, we should clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      throw createProfileError;
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

  } catch (error: any) {
    console.error("Error creating user:", error);
    
    // Provide more user-friendly error messages
    let errorMessage = "An unexpected error occurred while creating the user";
    
    if (error.message?.includes("already been registered") || error.message?.includes("email_exists")) {
      errorMessage = "A user with this email address already exists. Please use a different email address.";
    } else if (error.message?.includes("Missing required fields")) {
      errorMessage = "Please fill in all required fields";
    } else if (error.message?.includes("Invalid role")) {
      errorMessage = "Invalid user role specified";
    } else if (error.message) {
      errorMessage = error.message;
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
