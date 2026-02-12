
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRpc() {
    console.log("Checking 'get_managerial_stats' function...");
    const { data, error } = await supabase.rpc('get_managerial_stats');

    if (error) {
        console.error("RPC Call Failed:");
        console.error(JSON.stringify(error, null, 2));
    } else {
        console.log("RPC Call Success!");
        console.log("Data received:", JSON.stringify(data, null, 2));
    }
}

checkRpc();
