
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

  async function inspectSchema() {
    console.log("Fetching one bill to inspect columns...");
    const { data: bills, error } = await supabase.from("bills").select("*").limit(1);
    if (error) console.error(error);
    else if (bills.length > 0) {
      console.log("Bill columns:", Object.keys(bills[0]));
    } else {
      console.log("No bills found.");
    }

     console.log("Fetching one document to inspect columns...");
    const { data: docs, error: dError } = await supabase.from("documents").select("*").limit(1);
    if (dError) console.error(dError);
    else if (docs.length > 0) {
        console.log("Document columns:", Object.keys(docs[0]));
    }
  }

  inspectSchema();

} catch (err) {
  console.error(err);
}
