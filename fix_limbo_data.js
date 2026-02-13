
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Manually read .env
try {
  const envPath = path.resolve(process.cwd(), ".env");
  const envContent = fs.readFileSync(envPath, "utf-8");
  const env = {};
  
  envContent.split(/\r?\n/).forEach(line => {
    line = line.trim();
    if (!line || line.startsWith("#")) return;
    
    const idx = line.indexOf("=");
    if (idx !== -1) {
      const key = line.substring(0, idx).trim();
      let value = line.substring(idx + 1).trim();
      // Strip quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      env[key] = value;
    }
  });

  const supabaseUrl = env["VITE_SUPABASE_URL"];
  const supabaseKey = env["VITE_SUPABASE_ANON_KEY"] || env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  
  // Note: For Update operations, we ideally need the SERVICE_ROLE_KEY or the user must be logged in/have policies allowing updates.
  // The ANON key might fail if RLS policies prevent anonymous updates.
  // We'll try with ANON key, but if it fails, we might need to ask user for SERVICE_ROLE_KEY or use the dashboard SQL editor.
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  async function fixLimbo() {
    console.log("Identifying 'Pending' items with NO dates...");

    // 1. Process Bills
    const { data: bills, error: bError } = await supabase
      .from("bills")
      .select("id, title")
      .eq("status", "pending")
      .is("date_committed", null)
      .is("presentation_date", null)
      .is("date_laid", null);
      
    if (bError) console.error("Error searching bills:", bError);
    else if (bills) {
        console.log(`Found ${bills.length} bills to update.`);
        for (const b of bills) {
            const { error: updateError } = await supabase
                .from("bills")
                .update({ 
                    status: "limbo", 
                    status_reason: "Undated item (Migrated from Pending)" 
                })
                .eq("id", b.id);
            
            if (updateError) console.error(`Failed to update bill ${b.id}:`, updateError.message);
            else console.log(`Updated Bill: ${b.title.substring(0, 30)}...`);
        }
    }

    // 2. Process Documents
    const { data: docs, error: dError } = await supabase
        .from("documents")
        .select("id, title")
        .eq("status", "pending")
        .is("date_committed", null)
        .is("presentation_date", null)
        .is("date_laid", null);

    if (dError) console.error("Error searching documents:", dError);
    else if (docs) {
        console.log(`Found ${docs.length} documents to update.`);
        for (const d of docs) {
            const { error: updateError } = await supabase
                .from("documents")
                .update({ 
                    status: "limbo", 
                    status_reason: "Undated item (Migrated from Pending)" 
                })
                .eq("id", d.id);
            
            if (updateError) console.error(`Failed to update doc ${d.id}:`, updateError.message);
            else console.log(`Updated Doc: ${d.title.substring(0, 30)}...`);
        }
    }
  }

  fixLimbo();

} catch (err) {
  console.error(err);
}
