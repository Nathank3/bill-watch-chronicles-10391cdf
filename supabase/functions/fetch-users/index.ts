
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify user is admin
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    // Check role, allowing Super Admin access logic
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isSuperAdmin = profile?.role === 'super_admin' || user.email === 'nathankimeu067@gmail.com';
    const isAdmin = profile?.role === 'admin';

    if (!isAdmin && !isSuperAdmin) {
      throw new Error('Forbidden: Admin access required');
    }

    // Fetch auth users using admin API to get emails
    // Fetching up to 1000 users to be safe
    const { data: { users: authUsers }, error: authError } = await supabaseClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });
    if (authError) throw authError;

    // Fetch profiles to get usernames and roles
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, username, role');
    
    if (profilesError) throw profilesError;

    // Merge data
    const usersList = authUsers.map((u: any) => {
      const profile = profiles.find((p: any) => p.id === u.id);
      return {
        id: u.id,
        email: u.email,
        username: profile?.username || null,
        role: profile?.role || 'public', // Default to public if not found
        created_at: u.created_at
      };
    });

    return new Response(JSON.stringify({ users: usersList }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
