
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Manually read .env
try {
  const envPath = path.resolve(process.cwd(), ".env");
  const envContent = fs.readFileSync(envPath, "utf-8");
  const env: Record<string, string> = {};
  
  envContent.split("\n").forEach(line => {
    const [key, value] = line.split("=");
    if (key && value) {
      env[key.trim()] = value.trim();
    }
  });

  const supabaseUrl = env["VITE_SUPABASE_URL"];
  const supabaseKey = env["VITE_SUPABASE_ANON_KEY"];

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  async function checkStatuses() {
    console.log("Checking Bills statuses...");
    const { data: bills, error: billsError } = await supabase
      .from("bills")
      .select("status, status_reason")
      .limit(100);
      
    if (billsError) console.error("Error fetching bills:", billsError);
    else {
      // generic approach to count statuses
      const statuses = new Set(bills.map((b: any) => b.status));
      console.log("Distinct Bill Statuses:", Array.from(statuses));
      // Log some examples of status logic if relevant
      const limboBills = bills.filter((b: any) => b.status?.toLowerCase().includes("limbo"));
      console.log(`Found ${limboBills.length} bills with 'limbo' in status.`);
      if (limboBills.length > 0) console.log("Example Limbo Bill Status:", limboBills[0].status);
    }

    console.log("\nChecking Documents statuses...");
    const { data: docs, error: docsError } = await supabase
      .from("documents")
      .select("status, status_reason")
      .limit(100);

    if (docsError) console.error("Error fetching documents:", docsError);
    else {
      const statuses = new Set(docs.map((d: any) => d.status));
      console.log("Distinct Document Statuses:", Array.from(statuses));
        const limboDocs = docs.filter((d: any) => d.status?.toLowerCase().includes("limbo"));
      console.log(`Found ${limboDocs.length} documents with 'limbo' in status.`);
      if (limboDocs.length > 0) console.log("Example Limbo Doc Status:", limboDocs[0].status);
    }
  }

  checkStatuses();

} catch (err) {
  console.error("Script failed:", err);
}
