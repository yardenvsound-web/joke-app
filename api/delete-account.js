// מחיקת החשבון של המשתמש שמחובר. הבדיחות שלו נשארות, בלי שם ובלי בעלים.
import { supabase, hasToken, getUserFromRequest } from "../lib/supabase.js";
import { json, authRequired } from "../lib/http.js";

const GENERIC_ERROR = "לא הצלחנו למחוק את החשבון. נסו שוב.";

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return json({ error: "אפשר למחוק חשבון רק בלחיצה על הכפתור." }, 405);
    }

    if (!hasToken(request)) return authRequired("צריך להתחבר כדי למחוק חשבון.");
    if (!supabase) return json({ error: GENERIC_ERROR }, 500);

    let user;
    try {
      user = await getUserFromRequest(request, supabase);
    } catch (error) {
      console.error("delete-account: auth check failed:", error?.message || error);
      return json({ error: GENERIC_ERROR }, 500);
    }
    if (!user) return authRequired();

    // 1. השם יורד מהבדיחות. נכשל: לא מוחקים את המשתמש.
    const { error: clearError } = await supabase
      .from("jokes")
      .update({ author_name: null })
      .eq("user_id", user.id);
    if (clearError) {
      console.error(`delete-account: clear names failed: code=${clearError.code} message=${clearError.message}`);
      return json({ error: GENERIC_ERROR }, 500);
    }

    // 2. המשתמש נמחק. user_id בבדיחות מתאפס לבד (on delete set null).
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error(`delete-account: deleteUser failed: status=${deleteError.status} message=${deleteError.message}`);
      return json({ error: GENERIC_ERROR }, 500);
    }

    console.log(`account deleted: user=${user.id}`);
    return json({ deleted: true });
  },
};
