// צחוק אחד: מוסיפה 1 למונה של בדיחה, דרך הפונקציה public.add_laugh.
import { supabase } from "../lib/supabase.js";

const GENERIC_ERROR = "משהו השתבש. נסו שוב.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return json({ error: "אפשר לצחוק רק בלחיצה על הכפתור." }, 405);
    }

    let id = null;
    try {
      const body = await request.json();
      if (typeof body?.id === "string") id = body.id.trim();
    } catch {
      // גוף שבור: נטפל בו כמו id חסר
    }

    if (!id || !UUID.test(id)) {
      return json({ error: "הבדיחה הזו לא מוכרת." }, 400);
    }

    if (!supabase) return json({ error: GENERIC_ERROR }, 500);

    const { data, error } = await supabase.rpc("add_laugh", { joke_id: id });

    if (error) {
      console.error(`add_laugh failed: code=${error.code} message=${error.message}`);
      return json({ error: GENERIC_ERROR }, 500);
    }

    if (data === null || data === undefined) {
      return json({ error: "הבדיחה הזו לא נמצאה." }, 404);
    }

    console.log(`laugh: id=${id} laughs=${data}`);
    return json({ laughs: data });
  },
};
