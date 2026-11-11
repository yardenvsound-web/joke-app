// הכתובת והמפתח הציבורי של Supabase, רק בשביל הכניסה בדפדפן.
// אף פעם לא מחזירה מפתח סודי.
import { json } from "../lib/http.js";

// מפתח סודי, חדש או ישן (JWT עם role של service_role)
function isSecretKey(key) {
  if (key.startsWith("sb_secret_")) return true;
  const parts = key.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return payload?.role === "service_role";
  } catch {
    return false;
  }
}

export default {
  async fetch(request) {
    if (request.method !== "GET") {
      return json({ error: "אפשר רק לקרוא את ההגדרות." }, 405);
    }

    const url = process.env.SUPABASE_URL;
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!url || !publishableKey || isSecretKey(publishableKey)) {
      console.error(
        `auth not configured: SUPABASE_URL=${url ? "set" : "missing"} SUPABASE_PUBLISHABLE_KEY=${
          !publishableKey ? "missing" : isSecretKey(publishableKey) ? "secret key (rejected)" : "set"
        }`
      );
      return json({ error: "הכניסה לא זמינה כרגע.", code: "auth_not_configured" }, 500);
    }

    return json({ url, publishableKey });
  },
};
