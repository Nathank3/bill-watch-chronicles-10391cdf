
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

  // Get Supabase client with service role key for admin operations
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Parse the request body
    const { userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // Verify the current user is an admin using the auth header
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: getUserError } = await userClient.auth.getUser();

    if (getUserError || !user) {
      return new Response(JSON.stringify({ error: 'Authentication failed' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401 
      });
    }

    // Check if the current user is an admin
    const { data: currentUserRole, error: roleError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError || currentUserRole.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized. Only admins can delete users.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      });
    }

    // Prevent admin from deleting themselves
    if (userId === user.id) {
      return new Response(JSON.stringify({ error: 'You cannot delete your own account.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    console.log('Starting user deletion process for user:', userId);

    // Step 1: Delete from profiles table first (this removes the foreign key reference)
    const { error: profileDeleteError } = await supabaseClient
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileDeleteError) {
      console.error('Error deleting profile:', profileDeleteError);
      return new Response(JSON.stringify({ error: 'Failed to delete user profile: ' + profileDeleteError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    console.log('Profile deleted successfully');

    // Step 2: Delete any password reset tokens for this user
    const { error: tokenDeleteError } = await supabaseClient
      .from('password_reset_tokens')
      .delete()
      .eq('user_id', userId);

    if (tokenDeleteError) {
      console.warn('Warning: Could not delete password reset tokens:', tokenDeleteError);
      // Don't fail the whole operation for this
    }

    // Step 3: Delete from auth.users table using the service role client
    const { error: authDeleteError } = await supabaseClient.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
      // If auth deletion fails, we should restore the profile to maintain consistency
      // For now, we'll just log the error and continue
      return new Response(JSON.stringify({ error: 'Failed to delete user from authentication: ' + authDeleteError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    console.log('User deleted successfully from auth.users');

    return new Response(JSON.stringify({ success: true, message: 'User deleted successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error("Error in delete-user function:", error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
