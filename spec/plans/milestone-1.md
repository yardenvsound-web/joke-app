# Milestone 1: Walking Skeleton

## המטרה
הדף והפונקציה באוויר ב-Vercel, באותה כתובת, ומדברים זה עם זה. המפתח שמור ב-Vercel, אבל עוד בלי AI.

## תכנון

### הקבצים שנוצרים
| קובץ | מה בו |
|---|---|
| `index.html` | המסך הראשי לפי DESIGN.md, עם ה-CSS וה-JavaScript בתוכו |
| `api/joke.js` | `export default { async fetch(request) {...} }`. מחזיר בדיחה זמנית ו"המפתח: נמצא/חסר" |
| `package.json` | `"type": "module"`, בלי dependencies |

### index.html
- `lang="he"`, `dir="rtl"`, viewport לטלפון.
- גופנים מ-Google Fonts: Fredoka (500, 600, 700) ו-Playpen Sans Hebrew (500), עם גיבוי ל-system-ui.
- הצבעים מ-DESIGN.md כמשתני CSS.
- רקע: `assets/bg-dots.svg` חוזר, ו-`assets/bg-doodles.svg` פעם אחת למעלה במרכז.
- מלמעלה למטה: לוגו (`assets/logo.svg`, רוחב 300), שורת הסבר, תווית "על מה הבדיחה?", תיבה (maxlength 100, "למשל: חתולים"), כפתור "תנו לי בדיחה!", בועה עם הדמות, ושורת תחתית "מיישם AI ואוטומציה · 53500".
- הסגנון: מסגרות 3 בדיו, צללים קשים, הסיבובים הקטנים, הפינות והמרווחים לפי DESIGN.md. טבעת פוקוס כחולה.
- הבועה עם `data-state` ו-`aria-live="polite"`.
- בשליחה: POST ל-`/api/joke` עם `{ topic }`, והתוצאה מוצגת בבועה עם `textContent`.

### מה נכנס עכשיו ומה ב-Milestone 2
- עכשיו: מצב ההתחלה המלא (הדמות המחייכת והקפיצה שלה), נעילת הכפתור בזמן הבקשה, והצגת הטקסט שחזר בבועה, בכתב יד.
- ב-Milestone 2: ארבעת המצבים המלאים (חושב, צוחק בפינה, שגיאה), "עוד בדיחה!" ו"לנסות שוב", וכל האנימציות.

### api/joke.js
- רק POST. שיטה אחרת: 405 עם `{ "error": "..." }`.
- קורא את הגוף כ-JSON. גוף שבור: נושא ריק.
- מחזיר `{ "joke": "בדיחה זמנית מהשרת: [הנושא]. המפתח: נמצא" }`, או "חסר" כש-`process.env.OPENAI_API_KEY` ריק. רק כן או לא, אף פעם לא הערך.
- `console.log` קצר לכל בקשה (הנושא), כדי שתהיה שורה ב-Logs.
- בלי כותרות CORS ובלי טיפול ב-OPTIONS.

### בדיקות לפני commit
- `.gitignore`, `.env.example`, `.claude/settings.json` קיימים. (נבדק: שלושתם קיימים.)
- אין `.env` או `.env.local` בקבצים שנכנסים ל-commit.

### מה עושים ביד (את/ה), אחרי ה-push
1. Vercel: New Project, Import לריפו `joke-app`, Framework Preset: Other, Deploy.
2. OpenAI, API keys: יוצרים מפתח production בשם `joke-in-a-click`.
3. Vercel, Settings, Environment Variables: `OPENAI_API_KEY`, Sensitive (Secret), בסביבות Production ו-Preview. ואז Redeploy.
4. (רשות, להרצה מקומית) מפתח dev בשם `joke-in-a-click-dev`, מעתיקים את `.env.example` ל-`.env.local` ומדביקים ביד. אחר כך `npm i -g vercel`, `vercel login`, `vercel link`, `vercel dev`.

## בנייה
- `package.json`: שם, `private`, `"type": "module"`. בלי dependencies.
- `api/joke.js`: פונקציית `json()` קטנה לתשובות, ו-`export default { async fetch(request) }`. רק POST (אחרת 405). הנושא נחתך ל-100 תווים, וגוף שבור נחשב "בלי נושא". `console.log` לכל בקשה עם הנושא ו"נמצא/חסר".
- `index.html`: המסך לפי ה-mockup, עם משתני CSS לצבעים, הגופנים מ-Google Fonts, רקע הנקודות והקישוטים, לוגו, תיבה, כפתור, בועה עם `data-state` ו-`aria-live`, ושורת תחתית. בזמן הבקשה הכפתור נעול ויורד, וכותב "חושב...". התשובה מוצגת בבועה עם `textContent`, בכתב יד. בכשל: רקע ורדרד והודעה קצרה. `prefers-reduced-motion` מבטל תנועה.
- נבדק במחשב בתצוגת טלפון (375): המסך תואם ל-mockup, ולחיצה עם "חתולים" מחזירה "בדיחה זמנית מהשרת: חתולים. המפתח: חסר" (במחשב אין מפתח, כצפוי).
- הפונקציה נבדקה גם ישירות: POST עם נושא, גוף שבור, ו-GET שמחזיר 405.

## הרצה וסגירה
- נבדק ב-Vercel. הלינק החי: https://joke-app-one-sigma.vercel.app
- "כלבים" מחזיר "בדיחה זמנית מהשרת: כלבים. המפתח: נמצא". ב-Network יש POST אחד ל-/api/joke באותה כתובת, וב-Logs יש שורה לכל לחיצה.
- הכתובת joke-app-yardenv.vercel.app חסומה בהגנת Vercel, אבל הכתובת הראשית פתוחה לכולם.
- הושלם ואושר.
