// בדיחה מ-OpenAI, עם המפתח מהסביבה, ושמירה שלה בטבלה public.jokes.
// משתמש מחובר מזוהה רק לפי הטוקן, והבדיחה נשמרת עם השם שלו.
import { supabase, hasToken, getUserFromRequest, displayName } from "../lib/supabase.js";
import { json, authRequired, readJson } from "../lib/http.js";

const INSTRUCTIONS =
  "אתה כותב בדיחות קצרות בעברית. כתוב בדיחה אחת בלבד, עד ארבעה משפטים, נקייה ומתאימה לכל גיל. בלי הקדמה, בלי הסבר ובלי אימוג׳י. רק הבדיחה.";

const GENERIC_ERROR = "משהו השתבש. נסו שוב.";
const REFUSAL_ERROR = "על הנושא הזה אין לי בדיחה. נסו נושא אחר.";

// הודעה בעברית לפי השגיאה שחזרה מ-OpenAI
function messageForError(status, code) {
  if (status === 401) return "יש בעיה במפתח של השרת.";
  if (code === "insufficient_quota" || code === "billing_hard_limit_reached") {
    return "נגמר התקציב לבדיחות החודש.";
  }
  if (status === 429) return "יותר מדי בקשות. נסו שוב בעוד רגע.";
  if (status === 404 || code === "model_not_found") return "המודל לא נמצא בשרת.";
  return GENERIC_ERROR;
}

// הטקסט מתוך התשובה: output_text אם קיים, אחרת חלקי output_text בפריטי message
function extractJoke(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return { text: data.output_text.trim() };
  }
  let refused = false;
  const parts = [];
  for (const item of Array.isArray(data?.output) ? data.output : []) {
    if (item?.type !== "message") continue;
    for (const part of Array.isArray(item.content) ? item.content : []) {
      if (part?.type === "output_text" && typeof part.text === "string") parts.push(part.text);
      if (part?.type === "refusal") refused = true;
    }
  }
  const text = parts.join("").trim();
  return text ? { text } : { refused };
}

// שומרת את הבדיחה ומחזירה את ה-id. כל כישלון: null, והבדיחה עדיין מגיעה למשתמש.
async function saveJoke(topic, text, user) {
  if (!supabase) {
    console.error("joke not saved: Supabase is not configured");
    return null;
  }
  try {
    const { data, error } = await supabase
      .from("jokes")
      .insert({
        topic,
        text,
        user_id: user ? user.id : null,
        author_name: user ? displayName(user) : null,
      })
      .select("id")
      .single();
    if (error) {
      console.error(`joke not saved: code=${error.code} message=${error.message}`);
      return null;
    }
    return data?.id ?? null;
  } catch (error) {
    console.error("joke not saved:", error?.message || error);
    return null;
  }
}

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return json({ error: "אפשר לבקש בדיחה רק בלחיצה על הכפתור." }, 405);
    }

    // גוף שבור או גדול מדי: ממשיכים בלי נושא
    const body = await readJson(request);
    const topic = typeof body?.topic === "string" ? body.topic.trim().slice(0, 100) : "";

    // מי שואל: לפני OpenAI, כדי שטוקן רע לא יעלה כסף.
    // Supabase לא זמין: הבדיחה מגיעה, אבל לא נשמרת, כי לא ידוע מי כתב אותה.
    let user = null;
    let canSave = true;
    if (hasToken(request)) {
      try {
        user = await getUserFromRequest(request, supabase);
        if (!user) return authRequired();
      } catch (error) {
        console.error("joke: auth check failed, not saving:", error?.message || error);
        canSave = false;
      }
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-5";

    if (!apiKey) {
      console.error("OPENAI_API_KEY is missing");
      return json({ error: GENERIC_ERROR }, 500);
    }

    console.log(`joke request: topic="${topic}" model=${model} user=${user ? user.id : "guest"}`);

    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          instructions: INSTRUCTIONS,
          input: topic ? `נושא הבדיחה: ${topic}` : "אין נושא. ספר בדיחה כללית על החיים.",
          reasoning: { effort: "low" },
          max_output_tokens: 1500,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const code = data?.error?.code || data?.error?.type || "unknown";
        console.error(`OpenAI error: status=${response.status} code=${code}`);
        return json({ error: messageForError(response.status, code) }, 502);
      }

      const { text, refused } = extractJoke(data);
      if (!text) {
        console.error(`OpenAI returned no text: refused=${Boolean(refused)} status=${data?.status}`);
        return json({ error: refused ? REFUSAL_ERROR : GENERIC_ERROR }, 502);
      }

      const authorName = user ? displayName(user) : null;
      const id = canSave ? await saveJoke(topic, text, user) : null;
      return json(id ? { joke: text, id, author_name: authorName } : { joke: text, author_name: authorName });
    } catch (error) {
      console.error("OpenAI request failed:", error?.message || error);
      return json({ error: GENERIC_ERROR }, 502);
    }
  },
};
