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

// הטוקן מהכותרת Authorization: Bearer <טוקן>, או null
function tokenFrom(request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : null;
}

export function hasToken(request) {
  return Boolean(tokenFrom(request));
}

// המשתמש לפי הטוקן, רק דרך Supabase. אין טוקן או טוקן לא מוכר: null.
// Supabase לא זמין: זורקת שגיאה, כדי שהפונקציה תבדיל בין "טוקן רע" ל"אין שירות".
export async function getUserFromRequest(request, client) {
  const token = tokenFrom(request);
  if (!token) return null;
  if (!client) throw new Error("Supabase is not configured");

  const { data, error } = await client.auth.getUser(token);
  if (error) {
    const status = Number(error.status) || 0;
    if (status >= 400 && status < 500) return null;
    throw new Error(`getUser failed: status=${status || "none"} message=${error.message}`);
  }
  return data?.user ?? null;
}

// השם לתצוגה: full_name מ-user_metadata, עד 30 תווים. ריק: null.
export function displayName(user) {
  const name = user?.user_metadata?.full_name;
  if (typeof name !== "string") return null;
  const trimmed = [...name.trim()].slice(0, 30).join("").trim();
  return trimmed || null;
}
