// הצבעה אחת: אהבתי (1), לא אהבתי (-1), או ביטול (0), דרך הפונקציה public.cast_vote.
// המצביע מזוהה רק לפי הטוקן. user_id שמגיע בגוף לא נקרא בכלל.
import { supabase, hasToken, getUserFromRequest } from "../lib/supabase.js";
import { json, authRequired, readJson } from "../lib/http.js";

const GENERIC_ERROR = "ההצבעה לא נשמרה. נסו שוב.";
const INVALID = "ההצבעה הזו לא תקינה.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return json({ error: "אפשר להצביע רק בלחיצה על הכפתור." }, 405);
    }

    if (!hasToken(request)) return authRequired("צריך להתחבר כדי לדרג.");

    const body = await readJson(request);
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    const value = body?.value;
    if (!UUID.test(id) || typeof value !== "number" || ![1, -1, 0].includes(value)) {
      return json({ error: INVALID }, 400);
    }

    if (!supabase) return json({ error: GENERIC_ERROR }, 500);

    let user;
    try {
      user = await getUserFromRequest(request, supabase);
    } catch (error) {
      console.error("vote: auth check failed:", error?.message || error);
      return json({ error: GENERIC_ERROR }, 500);
    }
    if (!user) return authRequired();

    const { data, error } = await supabase.rpc("cast_vote", {
      voter: user.id,
      target: id,
      new_value: value,
    });

    if (error) {
      if (error.code === "P0002") return json({ error: "הבדיחה הזו לא נמצאה." }, 404);
      if (error.code === "22023") return json({ error: INVALID }, 400);
      if (error.code === "23503") return authRequired();
      console.error(`cast_vote failed: code=${error.code} message=${error.message}`);
      return json({ error: GENERIC_ERROR }, 500);
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return json({ error: GENERIC_ERROR }, 500);

    console.log(`vote: joke=${id} user=${user.id} value=${value}`);
    return json({
      likes: Number(row.likes) || 0,
      dislikes: Number(row.dislikes) || 0,
      my_vote: row.my_vote ?? null,
    });
  },
};
