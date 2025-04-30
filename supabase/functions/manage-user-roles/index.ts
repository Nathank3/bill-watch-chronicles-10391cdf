
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204,
    });
  }

  // Get the authorization header from the request
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Authorization header is required' }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401 
    });
  }

  // Get Supabase client
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  try {
    // Parse the request body
    const { userId, role } = await req.json();

    // Check if the current user is an admin
    const {
      data: { user },
      error: getUserError,
    } = await supabaseClient.auth.getUser();

    if (getUserError) {
      return new Response(JSON.stringify({ error: 'Authentication failed' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401 
      });
    }

    // Get the current user's role
    const { data: currentUserRole, error: roleError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError || currentUserRole.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized. Only admins can manage roles.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      });
    }

    // Update the user's role
    const { data, error } = await supabaseClient
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
