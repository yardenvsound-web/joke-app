// הפונקציה היחידה בשרת. הדפדפן פונה רק אליה, והיא פונה ל-OpenAI עם המפתח מהסביבה.

const INSTRUCTIONS =
  "אתה כותב בדיחות קצרות בעברית. כתוב בדיחה אחת בלבד, עד ארבעה משפטים, נקייה ומתאימה לכל גיל. בלי הקדמה, בלי הסבר ובלי אימוג׳י. רק הבדיחה.";

const GENERIC_ERROR = "משהו השתבש. נסו שוב.";
const REFUSAL_ERROR = "על הנושא הזה אין לי בדיחה. נסו נושא אחר.";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

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

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return json({ error: "אפשר לבקש בדיחה רק בלחיצה על הכפתור." }, 405);
    }

    let topic = "";
    try {
      const body = await request.json();
      if (typeof body?.topic === "string") topic = body.topic.trim().slice(0, 100);
    } catch {
      // גוף שבור: ממשיכים בלי נושא
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-5";

    if (!apiKey) {
      console.error("OPENAI_API_KEY is missing");
      return json({ error: GENERIC_ERROR }, 500);
    }

    console.log(`joke request: topic="${topic}" model=${model}`);

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

      return json({ joke: text });
    } catch (error) {
      console.error("OpenAI request failed:", error?.message || error);
      return json({ error: GENERIC_ERROR }, 502);
    }
  },
};
