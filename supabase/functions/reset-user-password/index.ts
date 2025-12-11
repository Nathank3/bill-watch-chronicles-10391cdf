
import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResetPasswordRequest {
    userId: string;
    newPassword: string;
}

serve(async (req: Request) => {
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
            return new Response(JSON.stringify({ error: 'Unauthorized. Only admins can reset passwords.' }), { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 403 
            });
        }

        const { userId, newPassword }: ResetPasswordRequest = await req.json();

        if (!userId || !newPassword) {
            throw new Error("Missing userId or newPassword");
        }

        if (newPassword.length < 6) {
            throw new Error("Password must be at least 6 characters long");
        }

        // Update user password
        const { data: user, error } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { password: newPassword }
        );

        if (error) {
            throw error;
        }

        return new Response(
            JSON.stringify({
                message: "Password updated successfully",
                user: user
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            }
        );

    } catch (error) {
        console.error("Error resetting password:", error);

        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
            {
                status: 400,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            }
        );
    }
});
