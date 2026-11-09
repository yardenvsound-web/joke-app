# Milestone 4: האפליקציה זוכרת

## המטרה
כל בדיחת AI נשמרת ב-Supabase, אפשר לצחוק עליה, ויש רשימת "הכי מצחיקות". רק הפונקציות בתיקיית api מדברות עם Supabase. הדף מדבר רק עם /api.

## תכנון

### המצב לפני
- פרויקט Supabase: joke-app (ref `kydooupmuxucvdcconua`). ב-public אין טבלאות ואין migrations.
- ב-`sw.js` גרסת המטמון כבר עלתה ל-`joke-v2` (שינוי שעוד לא נכנס לקומיט). זה מכסה את השינוי ב-`index.html`.

### הקבצים שמשתנים
| קובץ | מה משתנה |
|---|---|
| `db/create_jokes.sql` | קובץ חדש: הטבלה, הנעילה והפונקציה add_laugh |
| `package.json` | `dependencies`: ‏`@supabase/supabase-js` בלבד |
| `package-lock.json` | נוצר מ-`npm install`, ונכנס לריפו |
| `lib/supabase.js` | קובץ חדש: הלקוח היחיד |
| `api/joke.js` | שמירה בטבלה, ו-`id` בתשובה |
| `api/laugh.js` | קובץ חדש |
| `api/top.js` | קובץ חדש |
| `index.html` | כפתור "צחקתי" ורשימת "הכי מצחיקות" |
| `sw.js` | כבר ב-`joke-v2`. בלי שינוי נוסף |

### ה-SQL (עצירה ראשונה)
```sql
create table public.jokes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  topic text,
  text text not null,
  laughs integer not null default 0
);

alter table public.jokes enable row level security;

revoke all on table public.jokes from anon, authenticated;
grant select, insert, update on table public.jokes to service_role;

create function public.add_laugh(joke_id uuid)
returns integer
language sql
security invoker
set search_path = ''
as $$
  update public.jokes
  set laughs = laughs + 1
  where id = joke_id
  returning laughs;
$$;

revoke execute on function public.add_laugh(uuid) from public, anon, authenticated;
grant execute on function public.add_laugh(uuid) to service_role;
```
- נשמר ב-`db/create_jokes.sql`, מוצג לך, ורק אחרי אישור רץ כ-migration בשם `create_jokes`.
- אחרי ההרצה: `get_advisors` (security), הסבר בעברית, ועצירה לבדיקה שלך.

### lib/supabase.js
- `createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } })`.
- אם אחד המשתנים חסר: מייצא `null`, ורושם `console.error`. הפונקציות בודקות את זה.

### api/joke.js
- אחרי שהבדיחה חוזרת מ-OpenAI: `insert({ topic, text })` ו-`select("id")`.
- הצלחה: `{ joke, id }`. כישלון, או לקוח חסר: `{ joke }` בלי id, ו-`console.error`. הבדיחה תמיד מגיעה.

### api/laugh.js
- רק POST (אחרת 405). גוף שבור או id שאינו uuid (בדיקה ב-regex): 400, בלי לגעת בטבלה.
- `rpc("add_laugh", { joke_id: id })`. תוצאה null: 404. שגיאה: 500 ו-`console.error`.
- הצלחה: `{ laughs: N }`.

### api/top.js
- רק GET (אחרת 405).
- `select("id, topic, text, laughs")`, ‏`gt("laughs", 0)`, מיון לפי laughs מהגבוה, ואז לפי created_at מהחדש, ‏`limit(5)`.
- הצלחה: `{ top: [...] }`. שגיאה: 500 ו-`console.error`.
- הכותרת `Cache-Control: no-store`, כדי שהרשימה תמיד תהיה עדכנית.

### index.html (העיצוב, בסגנון הקומיקס של DESIGN.md)
DESIGN.md לא מתאר את שני הרכיבים החדשים. ההצעה:
- **"צחקתי"**: גלולה קטנה בתוך הבועה, מתחת לבדיחה, בצד שמאל. רקע ורוד (#FF5FA8), טקסט בצבע הדיו, ‏Fredoka 18 במשקל 700, מסגרת 3, צל קשה 4. הטקסט: "צחקתי · 0".
  - בלחיצה: נעול מיד, POST ל-/api/laugh, המונה מתעדכן למספר שחזר, והטקסט "צחקתי! · N". הכפתור יורד והצל מתקצר, כמו הכפתור הגדול.
  - נכשל: הכפתור נפתח שוב, וכותב "לא הצליח, שוב?".
  - מופיע רק כשיש id. בדיחה חדשה מחזירה אותו למצב פתוח.
- **"הכי מצחיקות"**: כרטיס נייר מתחת לבועה, פינות 22, מסגרת 3, צל קשה 6, מסובב 0.8 מעלות.
  - כותרת "הכי מצחיקות" ב-Fredoka 22 במשקל 700.
  - רשימה ממוספרת (`ol`). בכל שורה: הבדיחה בכתב יד (Playpen 18), מתחתיה הנושא בדיו רך, ותג מנטה עם מספר הצחוקים.
  - אין עדיין: "עוד אין פה בדיחות. צחקו על אחת, והיא תופיע כאן."
  - נטען בפתיחת הדף, ושוב אחרי כל צחוק. בלי polling.
- כל טקסט מהנתונים עם `textContent`. בלי `innerHTML`.

### ביד, לפני הדחיפה (עצירה שנייה)
- ב-Vercel, ב-Environment Variables, בסביבות Production ו-Preview: `SUPABASE_URL` (Config) ו-`SUPABASE_SECRET_KEY` (Secret). המפתח עובר ישר מ-Supabase ל-Vercel.
- הרצה מקומית, רשות: מוסיפים את שניהם ל-`.env.local` ביד, ומריצים `npm install` לפני `vercel dev`.

### לפני הקומיט
- בדיקה ש-`.gitignore`, ‏`.env.example` ו-`.claude/settings.json` קיימים.
- `pass.txt` ו-`joke-app-spec.zip` לא נכנסים לריפו.

### בדיקות (תנאי ההשלמה)
1. ב-Supabase יש את הטבלה public.jokes עם חמש העמודות, ו-RLS דולק בלי אף policy.
2. get_advisors לא מראה בעיית אבטחה בטבלה או בפונקציה.
3. בקשה ישירה לטבלה עם המפתח הציבורי נכשלת או מחזירה רשימה ריקה.
4. כל בדיחת AI מופיעה כשורה חדשה בטבלה, עם הנושא והטקסט.
5. "צחקתי" מעלה את המונה ב-1, והכפתור ננעל.
6. בדיחה עם צחוק מופיעה מיד ב"הכי מצחיקות". עד חמש, מהגבוהה לנמוכה, בלי 0.
7. POST ל-/api/laugh עם id שאינו uuid מחזיר 400, ולא נוגע בטבלה.
8. ב-Network יש רק /api/joke, ‏/api/laugh ו-/api/top. אין supabase.co.
9. בקוד הדף אין `supabase` ואין `sb_secret`.
10. בלי SUPABASE_SECRET_KEY עדיין מגיעה בדיחה, וב-Logs יש שורה אדומה.
11. בריפו יש db/create_jokes.sql, ו-.env.example מכיל רק שתי שורות בלי ערכים.

## בנייה
- נוצר `db/create_jokes.sql`, בדיוק לפי התכנון. **עוד לא רץ ב-Supabase.** מחכה לאישור.
- `npm install @supabase/supabase-js@2`: נכנס ל-`dependencies` (‏^2.119.0), ונוצר `package-lock.json`.
- נוצרו `lib/supabase.js`, ‏`api/laugh.js` ו-`api/top.js`. ב-`api/joke.js` נוספה `saveJoke`, שמחזירה id או null.
- ב-`index.html`: הצבעים `--pink` ו-`--mint`, כפתור "צחקתי" בבועה, וכרטיס "הכי מצחיקות" מתחתיה. אם מגיעה בדיחה חדשה בזמן שצחוק עדיין בדרך, התשובה לא משנה את הכפתור של הבדיחה החדשה.
- נבדק:
  - לכל הקבצים ולסקריפט של הדף אין שגיאות תחביר.
  - בדף אין `supabase`, ‏`sb_secret` או `innerHTML`.
  - בלי משתני Supabase: ‏laugh מחזירה 405 ל-GET, ‏400 ל-id שאינו uuid ולגוף שבור, ו-500 ל-uuid תקין. ‏top מחזירה 405 ל-POST, ו-500 ל-GET.
  - העיצוב נבדק בדפדפן עם נתונים לדוגמה.
- ה-migration `create_jokes` רץ ב-joke-app אחרי אישור, והצליח.
  - נבדק: חמש העמודות קיימות, RLS דולק, ואין אף policy.
  - ל-anon ול-authenticated אין אף הרשאה על הטבלה, ואין להם execute על add_laugh. ל-service_role יש execute.
  - ל-service_role יש על הטבלה, מעבר ל-select, ‏insert ו-update, גם delete, ‏truncate, ‏references ו-trigger. אלה הגיעו מברירת המחדל של הפרויקט, ולא מה-SQL שלנו.
  - get_advisors (security): ממצא אחד, ברמה INFO: ‏`rls_enabled_no_policy` על public.jokes. זה בכוונה, ולא מוסיפים policy.
- migration נוסף, `tighten_jokes_grants` (עותק ב-`db/tighten_jokes_grants.sql`), רץ אחרי אישור: הסיר מ-service_role את delete, ‏truncate, ‏references ו-trigger.
  - נבדק: ל-service_role יש רק insert, ‏select ו-update. ל-anon ול-authenticated אין כלום.
  - get_advisors שוב: רק אותו ממצא INFO.
- עוד לא נבדק מול Supabase אמיתי מהפונקציות. זה יקרה אחרי ה-SQL ואחרי שהמשתנים יישמרו ב-Vercel.

## הרצה
- ב-Vercel נבדקו השמות והסביבות בלבד, בלי ערכים: ‏`SUPABASE_URL` (Config) ו-`SUPABASE_SECRET_KEY` (Secret), ב-Production וב-Preview.
- לפני הקומיט: `.gitignore`, ‏`.env.example` ו-`.claude/settings.json` קיימים. הגודל של `.env.example` הוא 37 בתים, בדיוק שתי השורות בלי ערכים (נבדק בלי לפתוח אותו). `pass.txt` ו-`joke-app-spec.zip` לא נכנסו.
- נדחף בקומיט f357148, והפריסה ב-Vercel מוכנה: https://joke-app-one-sigma.vercel.app
- נבדק מול האתר החי:
  - laugh עם `abc`: ‏400. עם uuid שלא קיים: ‏404.
  - joke על "חתולים": בדיחה עם id. השורה נשמרה בטבלה, עם הנושא והטקסט.
  - laugh על ה-id: ‏`{ "laughs": 1 }`, והבדיחה הופיעה מיד ב-top.
  - בקוד הדף אין `supabase` ואין `sb_secret`.
- נבדק במסד, בתפקיד anon (התפקיד של המפתח הציבורי): קריאה מהטבלה ו-add_laugh נכשלות עם permission denied. ההצעה של Postgres להוסיף grant ל-anon לא מתקבלת.
- בטבלה נשארה בדיחת הבדיקה על חתולים, עם צחוק אחד.
- עוד לבדיקה שלך: הכפתור והרשימה בטלפון, לשונית Network, ותנאי 10 (בלי SUPABASE_SECRET_KEY).
