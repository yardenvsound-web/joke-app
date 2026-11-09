// חמש הבדיחות הכי מצחיקות: רק עם צחוק אחד לפחות, מהגבוהה לנמוכה.
import { supabase } from "../lib/supabase.js";

const GENERIC_ERROR = "לא הצלחנו לטעון את הרשימה.";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export default {
  async fetch(request) {
    if (request.method !== "GET") {
      return json({ error: "אפשר רק לקרוא את הרשימה." }, 405);
    }

    if (!supabase) return json({ error: GENERIC_ERROR }, 500);

    const { data, error } = await supabase
      .from("jokes")
      .select("id, topic, text, laughs")
      .gt("laughs", 0)
      .order("laughs", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error(`top failed: code=${error.code} message=${error.message}`);
      return json({ error: GENERIC_ERROR }, 500);
    }

    return json({ top: data ?? [] });
  },
};
