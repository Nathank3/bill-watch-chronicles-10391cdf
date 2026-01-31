
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

try {
  const envPath = path.resolve(process.cwd(), ".env");
  const envContent = fs.readFileSync(envPath, "utf-8");
  const env = {};
  
  envContent.split(/\r?\n/).forEach(line => {
    line = line.trim();
    if (line && !line.startsWith("#")) {
        const idx = line.indexOf("=");
        if (idx !== -1) {
            const key = line.substring(0, idx).trim();
            let value = line.substring(idx + 1).trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.substring(1, value.length - 1);
            }
            env[key] = value;
        }
    }
  });

  const supabaseUrl = env["VITE_SUPABASE_URL"];
  const supabaseKey = env["VITE_SUPABASE_ANON_KEY"] || env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  const supabase = createClient(supabaseUrl, supabaseKey);

  async function checkStatusValues() {
    console.log("Checking ALL status values...");
    
    // Bills
    const { data: bills } = await supabase.from("bills").select("status");
    if (bills) {
        const statuses = new Set(bills.map(b => b.status));
        console.log("Distinct (Bills) Statuses:", Array.from(statuses));
    }

    // Documents
    const { data: docs } = await supabase.from("documents").select("status");
    if (docs) {
        const statuses = new Set(docs.map(d => d.status));
        console.log("Distinct (Documents) Statuses:", Array.from(statuses));
    }
  }

  checkStatusValues();

} catch (err) {
  console.error(err);
}
