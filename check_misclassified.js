
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

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
  const supabase = createClient(supabaseUrl, supabaseKey);

  async function checkMisclassified() {
    console.log("Checking for 'pending' items with missing dates...");
    
    // Check Bills
    const { data: bills, error: bError } = await supabase
      .from("bills")
      .select("title, status, date_committed, presentation_date, date_laid")
      .eq("status", "pending")
      .limit(50);

    if (bError) console.error(bError);
    else {
        // Condition for Limbo: No committed date AND no deadline? 
        // Or just no dates?
        // Let's filter for items with NO dates.
        const misclassified = bills.filter((b) => !b.date_committed && !b.presentation_date && !b.date_laid);
        console.log(`Found ${misclassified.length} 'pending' bills with NO dates (should be Limbo?).`);
        if (misclassified.length > 0) console.log("Example:", misclassified[0]);
    }
    
    // Check Documents
    const { data: docs, error: dError } = await supabase
        .from("documents")
        .select("title, status, date_committed, presentation_date, date_laid")
        .eq("status", "pending")
        .limit(50);
        
    if (dError) console.error(dError);
    else {
        const misclassified = docs.filter((d) => !d.date_committed && !d.presentation_date && !d.date_laid);
        console.log(`Found ${misclassified.length} 'pending' documents with NO dates.`);
        if (misclassified.length > 0) console.log("Example:", misclassified[0]);
    }
  }

  checkMisclassified();

} catch (err) {
  console.error(err);
}
