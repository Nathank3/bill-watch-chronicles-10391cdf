
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

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  async function checkStatuses() {
    console.log("Checking Bills statuses...");
    // Only select status, ignore status_reason as it fails
    const { data: bills, error: billsError } = await supabase
      .from("bills")
      .select("status")
      .limit(100);
      
    if (billsError) console.error("Error fetching bills:", billsError);
    else {
      const statuses = new Set(bills.map(b => b.status));
      console.log("Distinct Bill Statuses:", Array.from(statuses));
    }

    console.log("\nChecking Documents statuses...");
    const { data: docs, error: docsError } = await supabase
      .from("documents")
      .select("status")
      .limit(100);

    if (docsError) console.error("Error fetching documents:", docsError);
    else {
      const statuses = new Set(docs.map(d => d.status));
      console.log("Distinct Document Statuses:", Array.from(statuses));
    }
  }

  checkStatuses();

} catch (err) {
  console.error("Script failed:", err);
}
