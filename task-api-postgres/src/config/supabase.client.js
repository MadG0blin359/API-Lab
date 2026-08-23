import { createClient } from "@supabase/supabase-js";

export default supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUB_KEY,
);
