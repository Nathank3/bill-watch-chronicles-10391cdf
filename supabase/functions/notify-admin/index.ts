import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const payload = await req.json();
    const { record, table, type } = payload;

    // We only care about new submissions for review
    if (type !== "INSERT") {
      return new Response(JSON.stringify({ message: "Not an insert, skipping" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const title = record.title;
    const committee = record.committee;
    const businessType = table === "bills" ? "Bill" : record.type || "Document";
    const dashboardUrl = "https://bill-watch-chronicles.lovable.app/admin"; // Update with actual URL if different

    // 1. Find all Admin user profiles
    const { data: adminProfiles, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    if (profileError || !adminProfiles || adminProfiles.length === 0) {
      console.error("No admins found or error fetching profiles:", profileError);
      return new Response(JSON.stringify({ error: "No admins found" }), { status: 404 });
    }

    const adminIds = adminProfiles.map((p: { id: string }) => p.id);

    // 2. Fetch email addresses for those Admin IDs
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error("Error fetching admin emails:", authError);
      return new Response(JSON.stringify({ error: "Auth fetch failed" }), { status: 500 });
    }

    const adminEmails = users
      .filter((u: { id: string }) => adminIds.includes(u.id))
      .map((u: { email?: string }) => u.email)
      .filter((e: string | undefined): e is string => !!e);

    if (adminEmails.length === 0) {
      return new Response(JSON.stringify({ message: "No admin emails found" }), { status: 200 });
    }

    // 3. Send Email via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Bill Watch <onboarding@resend.dev>", // Replace with your verified domain in production
        to: adminEmails,
        subject: `New ${businessType} Submission: ${title}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #1e40af;">New Action Required</h2>
            <p>A new <strong>${businessType}</strong> has been submitted by a clerk and requires your review.</p>
            <hr style="border: 0; border-top: 1px solid #eee;" />
            <p><strong>Title:</strong> ${title}</p>
            <p><strong>Committee:</strong> ${committee}</p>
            <div style="margin-top: 20px;">
              <a href="${dashboardUrl}" style="background-color: #1e40af; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Review on Dashboard</a>
            </div>
            <p style="font-size: 12px; color: #666; margin-top: 30px;">
              This is an automated notification from the Bill Watch Chronicles system.
            </p>
          </div>
        `,
      }),
    });

    const resData = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(resData));

    return new Response(JSON.stringify({ success: true, emails_sent: adminEmails.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in notify-admin function:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
