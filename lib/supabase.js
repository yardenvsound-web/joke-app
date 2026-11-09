// הלקוח היחיד של Supabase. רק הפונקציות בתיקיית api מייבאות אותו.
// המקום היחיד שקורא את SUPABASE_SECRET_KEY. הקובץ מחוץ ל-api, כדי שלא יקבל כתובת משלו.
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error(`Supabase is not configured: SUPABASE_URL=${url ? "set" : "missing"} SUPABASE_SECRET_KEY=${key ? "set" : "missing"}`);
}

export const supabase =
  url && key
    ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;
