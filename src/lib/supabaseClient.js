import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://yvyknuurrwnwlrultrww.supabase.co";
const supabaseKey = "sb_publishable_mPzAS04ro9PoQldZAr5KtA_jOVL927H";

export const supabase = createClient(supabaseUrl, supabaseKey);