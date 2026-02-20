import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data } = await supabase.from('documents').select('*');
  if(!data) return;
  console.log('DOCS:', data.length);
  const r1 = data.filter(d => d.type === 'report');
  console.log('Reports:', r1.length);
  const r2 = r1.filter(d => d.status === 'pending');
  console.log('Pending reports:', r2.length);
  const r3 = r2.filter(d => d.committee === 'Water, Irrigation and Sanitation');
  console.log('Pending reports in Water:', r3.length);

  console.log('Presentation Dates for pending water reports:');
  r3.forEach(r => console.log(r.title, r.presentation_date, r.status));
}

run();
