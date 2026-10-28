// הפונקציה היחידה בשרת. ב-Milestone 1: בדיחה זמנית, ובדיקה אם המפתח קיים (כן או לא בלבד).

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
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

    const keyStatus = process.env.OPENAI_API_KEY ? "נמצא" : "חסר";
    console.log(`joke request: topic="${topic}" key=${keyStatus}`);

    return json({ joke: `בדיחה זמנית מהשרת: ${topic || "בלי נושא"}. המפתח: ${keyStatus}` });
  },
};
