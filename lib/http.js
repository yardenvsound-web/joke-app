// עזרים קטנים לכל הפונקציות. הקובץ מחוץ ל-api, כדי שלא יקבל כתובת משלו.

// תשובת JSON. no-store, כי התשובות תלויות במי ששואל.
export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

// 401: הדף יודע לפי הקוד שצריך להתחבר (שוב).
export function authRequired(message = "צריך להתחבר שוב.") {
  return json({ error: message, code: "auth_required" }, 401);
}

// גוף הבקשה כ-JSON. גוף גדול מהמגבלה, ריק או שבור: null.
export async function readJson(request, maxBytes = 4096) {
  try {
    const text = await request.text();
    if (!text || new TextEncoder().encode(text).length > maxBytes) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}
