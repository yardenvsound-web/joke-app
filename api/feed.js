// רשימות הבדיחות, דרך הפונקציה public.joke_feed:
// new (החדשות) ו-top (הכי מצחיקות) גם לאורח, liked (מה שאהבתי) רק עם טוקן.
import { supabase, hasToken, getUserFromRequest } from "../lib/supabase.js";
import { json, authRequired } from "../lib/http.js";

const GENERIC_ERROR = "לא הצלחנו לטעון את הרשימה.";
const LIMITS = { new: 20, top: 10, liked: 50 };

export default {
  async fetch(request) {
    if (request.method !== "GET") {
      return json({ error: "אפשר רק לקרוא את הרשימה." }, 405);
    }

    const mode = new URL(request.url).searchParams.get("mode") || "";
    if (!Object.hasOwn(LIMITS, mode)) {
      return json({ error: "הרשימה הזו לא מוכרת." }, 400);
    }

    if (mode === "liked" && !hasToken(request)) {
      return authRequired("צריך להתחבר כדי לראות מה אהבתם.");
    }

    if (!supabase) return json({ error: GENERIC_ERROR }, 500);

    // אורח: viewer הוא null. טוקן לא מוכר: 401, והדף מתנתק לבד.
    let viewer = null;
    if (hasToken(request)) {
      try {
        const user = await getUserFromRequest(request, supabase);
        if (!user) return authRequired();
        viewer = user.id;
      } catch (error) {
        console.error("feed: auth check failed:", error?.message || error);
        return json({ error: GENERIC_ERROR }, 500);
      }
    }

    const { data, error } = await supabase.rpc("joke_feed", {
      viewer,
      mode,
      max_rows: LIMITS[mode],
    });

    if (error) {
      console.error(`joke_feed failed: code=${error.code} message=${error.message}`);
      return json({ error: GENERIC_ERROR }, 500);
    }

    // השדות נבחרים אחד אחד, כדי שלא ייצא שום מזהה של משתמש
    const jokes = (Array.isArray(data) ? data : []).map((row) => ({
      id: row.id,
      topic: row.topic ?? null,
      text: row.text,
      author_name: row.author_name ?? null,
      likes: Number(row.likes) || 0,
      dislikes: Number(row.dislikes) || 0,
      my_vote: row.my_vote ?? null,
      created_at: row.created_at,
    }));

    return json({ jokes });
  },
};
