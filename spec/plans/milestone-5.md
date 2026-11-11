# Milestone 5: האפליקציה מכירה אותך

## המטרה
הרשמה וכניסה עם מייל וסיסמה, שם לתצוגה, התנתקות ומחיקת חשבון. בדיחה של משתמש מחובר נשמרת עם השם שלו. רמה 3 לפי course-stack.md. הדף ממשיך לדבר רק עם /api, והספרייה של Supabase בדפדפן משמשת רק לכניסה.

## תכנון

### המצב לפני
- פרויקט Supabase: joke-app (ref `kydooupmuxucvdcconua`). ב-public טבלה אחת, public.jokes, עם 11 שורות וחמש עמודות: id, ‏created_at, ‏topic, ‏text, ‏laughs. ‏RLS דולק.
- migrations שכבר רצו: `create_jokes`, ‏`tighten_jokes_grants`. ל-service_role על הטבלה רק select, ‏insert ו-update.
- `sw.js` בגרסה `joke-v2`. ‏`@supabase/supabase-js` מותקנת בגרסה 2.119.0.
- הפונקציות: joke, ‏laugh ו-top. כל אחת עם עזר `json()` משלה.

### העצירות במיילסטון
1. **אתה, בדשבורד של Supabase** (לפני הקוד):
   - Authentication, ואז Sign In / Providers: ‏Allow new users to sign up דולק. ‏Confirm email כבוי.
   - Authentication, ואז URL Configuration: ‏Site URL = ‏`https://joke-app-one-sigma.vercel.app`. ב-Redirect URLs: ‏`https://joke-app-one-sigma.vercel.app/**`, ואם תריץ במחשב גם `http://localhost:3000/**`.
2. **ה-SQL**: מוצג לך, ורץ רק אחרי אישור. אחריו get_advisors, הסבר ועצירה.
3. **אתה, ב-Vercel** (אחרי הקוד, לפני הדחיפה): ‏`SUPABASE_PUBLISHABLE_KEY` מסוג Config, בכל הסביבות. את הערך אביא עם get_publishable_keys.
4. **הרצה ובדיקה שלך**, ורק אז דחיפה.

### הקבצים שמשתנים
| קובץ | מה משתנה |
|---|---|
| `db/add_joke_authors.sql` | קובץ חדש: שתי עמודות, check ואינדקס |
| `lib/supabase.js` | נוספות `hasToken`, ‏`getUserFromRequest`, ‏`displayName` |
| `lib/http.js` | קובץ חדש: `json`, ‏`authRequired`, ‏`readJson` |
| `api/config.js` | קובץ חדש |
| `api/joke.js` | זיהוי המשתמש, שמירה עם user_id ו-author_name, ‏`author_name` בתשובה |
| `api/delete-account.js` | קובץ חדש |
| `auth.js` (בשורש) | קובץ חדש: כל הכניסה בדפדפן |
| `index.html` | הספרייה מ-jsDelivr, ‏auth.js, כפתור החשבון, שני חלונות, הטוקן בכל קריאה, שורת "נכתבה עכשיו בשבילך" |
| `sw.js` | ‏`joke-v3`, ו-`/auth.js` ברשימה |
| `api/laugh.js`, ‏`api/top.js` | בלי שינוי. נמחקים ב-Milestone 6 |

### ה-SQL: ‏db/add_joke_authors.sql
```sql
-- migration: add_joke_authors
-- מי כתב את הבדיחה. לאורח שתי העמודות ריקות.

alter table public.jokes
  add column user_id uuid references auth.users (id) on delete set null,
  add column author_name text;

alter table public.jokes
  add constraint jokes_author_name_length
  check (author_name is null or char_length(btrim(author_name)) between 1 and 30);

create index jokes_user_id_idx on public.jokes (user_id);
```
- הנעילה לא משתנה: אין policy, אין grant חדש. ‏service_role כבר יכול update, ומחיקת החשבון צריכה אותו כדי לנקות את author_name.
- אחרי ההרצה: בדיקה ש-anon ו-authenticated עדיין בלי הרשאות, ו-get_advisors (security ו-performance).

### lib/http.js
- `json(body, status = 200)`: ‏`Content-Type: application/json; charset=utf-8` ו-`Cache-Control: no-store`.
- `authRequired(message = "צריך להתחבר שוב.")`: ‏401 עם `{ error, code: "auth_required" }`.
- `readJson(request, maxBytes = 4096)`: קוראת טקסט, גוף גדול מהמגבלה או JSON שבור מחזיר `null`.

### lib/supabase.js
- הלקוח עצמו לא משתנה. עדיין המקום היחיד עם `SUPABASE_SECRET_KEY`.
- `hasToken(request)`: יש כותרת `Authorization: Bearer <טוקן>` לא ריקה.
- `getUserFromRequest(request, supabase)`:
  - אין טוקן: `null`.
  - `supabase.auth.getUser(token)`. טוקן לא מוכר (שגיאה עם status 400 עד 499): `null`.
  - אין לקוח, שגיאת רשת או status של 500 ומעלה: זורקת שגיאה. כך מבדילים בין "טוקן רע" ל"Supabase לא זמין".
- `displayName(user)`: ‏`user_metadata.full_name`, אחרי trim, עד 30 תווים. ריק: `null`.

### api/config.js
- GET בלבד (אחרת 405).
- מחזירה `{ url, publishableKey }` מ-`SUPABASE_URL` ומ-`SUPABASE_PUBLISHABLE_KEY`.
- חסר אחד מהם, או שהמפתח מתחיל ב-`sb_secret_`, או שהוא JWT ישן עם role של service_role: ‏500 עם `code: "auth_not_configured"`, ו-`console.error` בלי הערך.

### api/joke.js
- עובר ל-`json` ול-`readJson` מ-lib/http.js. הלוגיקה של OpenAI לא משתנה.
- **לפני** הקריאה ל-OpenAI, אם יש טוקן:
  - המשתמש נמצא: שומרים אותו.
  - טוקן לא מוכר: ‏401 עם auth_required, בלי לפנות ל-OpenAI.
  - Supabase לא זמין: ממשיכים כאורח, ובסוף לא שומרים בכלל (כי לא ידוע מי הכותב).
- שמירה: `insert({ topic, text, user_id, author_name })`. לאורח שני האחרונים `null`.
- התשובה: `{ joke, id, author_name }`. ‏`author_name` הוא `null` לאורח. ‏`id` חסר כשהשמירה נכשלה, כמו היום.

### api/delete-account.js
- POST בלבד, עם טוקן בלבד. בלי טוקן או עם טוקן לא מוכר: ‏401 auth_required. ‏Supabase לא זמין: ‏500.
- 1. `update({ author_name: null }).eq("user_id", user.id)` על public.jokes.
- 2. `supabase.auth.admin.deleteUser(user.id)`. ה-user_id בבדיחות מתאפס לבד (on delete set null).
- נכשל שלב 1: עוצרים, בלי למחוק את המשתמש. הצלחה: `{ deleted: true }`.

### auth.js (בדפדפן)
- נטען אחרי הספרייה, ושם על `window.Auth` אובייקט אחד.
- `ready`: ‏Promise שמביא את `/api/config`, יוצר `supabase.createClient(url, key, { auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })`, וממתין ל-`getSession()`.
- `signUp(name, email, password)`: ‏`options.data.full_name = name`.
- `signIn(email, password)`, ‏`signOut()` עם `scope: "local"`.
- `session()`, ‏`token()` (‏`access_token` הנוכחי או `null`), ‏`onChange(callback)`.
- הודעות בעברית לפי קוד השגיאה:
  - `invalid_credentials`: "המייל או הסיסמה לא נכונים."
  - `user_already_exists` / `email_exists`: "המייל הזה כבר רשום. נסו להיכנס."
  - `weak_password`: "הסיסמה קצרה מדי. צריך לפחות 6 תווים."
  - `email_address_invalid` / `validation_failed`: "המייל לא תקין."
  - `over_request_rate_limit`: "יותר מדי ניסיונות. נסו שוב בעוד רגע."
  - כל השאר: "משהו השתבש. נסו שוב."
- `/api/config` נכשל: הכניסה לא זמינה, הכפתור כותב "כניסה" אבל החלון מראה "הכניסה לא זמינה כרגע". בדיחות ממשיכות לעבוד.

### index.html
- `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/dist/umd/supabase.js" integrity="sha384-..." crossorigin="anonymous">`, ואחריו `<script src="/auth.js">`. את ה-integrity אחשב מהקובץ המקומי באותה גרסה.
- **כפתור החשבון**: מדבקה לבנה, מסגרת 3 בצבע הדיו, צל קשה 4, בפינה העליונה בצד שמאל, מעל הלוגו. לאורח: "כניסה". למחובר: עיגול סגול עם האות הראשונה, והשם (כמו ב-mockups-users.png).
- **חלון הכניסה** (`<dialog>`): עולה מלמטה בטלפון, באמצע במחשב. פינות 26, מסגרת 3, צל קשה 6. ‏Escape ולחיצה מחוץ לחלון סוגרים. כפתור סגירה.
  - שתי לשוניות (`role="tablist"`): כניסה והרשמה.
  - הרשמה: "איך לקרוא לך?" (‏`maxlength=30`, חובה), מייל, סיסמה (‏`minlength=6`). כפתור "נרשמים".
  - כניסה: מייל וסיסמה. כפתור "נכנסים".
  - הודעת שגיאה באדום מתחת לשדות, עם `role="alert"`. בזמן הבקשה הכפתור נעול וכותב "רגע...".
  - הצלחה: החלון נסגר, והשם מופיע בכפתור.
- **חלון "החשבון שלי"**: השם, המייל, "התנתקות", ו"מחיקת החשבון". המחיקה מחליפה את החלון בשאלה "למחוק את החשבון? הבדיחות שלך יישארו, בלי השם שלך." עם "כן, למחוק" ו"ביטול". אחרי המחיקה: התנתקות מקומית וסגירה.
- **כל קריאה ל-/api** עוברת דרך `api(path, options)` אחת, שמוסיפה `Authorization` אם יש טוקן. ‏401 עם auth_required כשנשלח טוקן: ‏`signOut` מקומי, והודעה "צריך להתחבר שוב" (בבועה, במקום הבדיחה).
- **מתחת לבדיחה** של משתמש מחובר: שורה קטנה בדיו רך, "נכתבה עכשיו בשבילך, " והשם שחזר מהשרת. לאורח: אין שורה.
- "צחקתי" ו"הכי מצחיקות" נשארים כמו שהם.
- כל טקסט מהשרת או מהמשתמש עם `textContent`.

### sw.js
- ‏`CACHE = "joke-v3"`, ו-`/auth.js` ב-PRECACHE. הספרייה מ-jsDelivr היא מכתובת אחרת, וה-service worker לא נוגע בה.

### לפני הקומיט
- בדיקה ש-`.gitignore`, ‏`.env.example` ו-`.claude/settings.json` קיימים. ‏`.env.example` לא משתנה.
- `pass.txt` ו-`joke-app-spec.zip` לא נכנסים לריפו.

### בדיקות (תנאי ההשלמה מ-milestones-5-6.md)
1. אורח מקבל בדיחה, והשורה בלי user_id ובלי author_name.
2. הרשמה: החלון נסגר, השם בכפתור. ב-Users המשתמש עם full_name ב-user_metadata.
3. בדיחה של מחובר: "נכתבה עכשיו בשבילך" עם השם, והשורה עם user_id ו-author_name.
4. סיסמה שגויה, מייל רשום, סיסמה קצרה: שלוש הודעות בעברית.
5. התנתקות ורענון: אורח. כניסה ורענון: מחובר.
6. משתמש בדיקה נוסף נמחק: נעלם מ-Users, הבדיחות שלו בלי שם.
7. ב-Network: ל-supabase.co רק /auth/v1, אין /rest/v1. ב-Ctrl+U אין sb_publishable_ ואין sb_secret_.
8. ‏/api/config מחזיר רק את הכתובת ואת המפתח הציבורי.
- בנוסף, אני בודק בעצמי: טוקן מזויף ל-/api/joke מחזיר 401 בלי קריאה ל-OpenAI (נראה ב-Logs), ו-delete-account בלי טוקן מחזיר 401.

## בנייה
- נוצר `db/add_joke_authors.sql`, בדיוק לפי התכנון. **עוד לא רץ ב-Supabase.** מחכה לאישור.
- נוצרו `lib/http.js`, ‏`api/config.js`, ‏`api/delete-account.js` ו-`auth.js`. ב-`lib/supabase.js` נוספו `hasToken`, ‏`getUserFromRequest` ו-`displayName`.
- `api/joke.js`: עבר ל-`json` ול-`readJson` מ-lib/http.js (ולכן עכשיו גם עם `no-store`). מזהה את המשתמש לפני OpenAI, ושומר עם user_id ו-author_name. התשובה: `{ joke, id, author_name }`.
- `auth.js`: ‏`token()` היא async, וקוראת ל-`getSession()`, כדי שטוקן שפג (למשל אחרי שהטלפון ישן) יתחדש לפני השליחה.
- `index.html`:
  - הספרייה מ-jsDelivr בגרסה 2.119.0, עם integrity (‏sha384), שחושב מהקובץ המקומי ותאם לקובץ ב-jsDelivr.
  - כפתור החשבון, חלון כניסה והרשמה, וחלון "החשבון שלי" עם שאלת אישור למחיקה.
  - פונקציה אחת, `api()`, לכל הקריאות. היא מוסיפה את הטוקן, ומתנתקת לבד על 401 עם auth_required.
  - בדיקות בדף לפני השליחה: שם חובה ועד 30 תווים, מייל תקין, סיסמה של 6 תווים לפחות בהרשמה.
- `sw.js`: ‏`joke-v3`, ו-`/auth.js` ב-PRECACHE.
- נבדק:
  - אין שגיאות תחביר בכל הקבצים ובסקריפט של הדף.
  - בדף וב-auth.js אין `innerHTML`, ‏`sb_publishable_` או `sb_secret_`.
  - config: ‏405 ל-POST. ‏500 עם auth_not_configured כשחסר משתנה, כשהמפתח מתחיל ב-sb_secret_, וכשהוא JWT של service_role. ‏200 עם מפתח ציבורי.
  - delete-account: ‏405 ל-GET. ‏401 עם auth_required בלי טוקן. ‏500 כש-Supabase לא מוגדר.
  - joke עם טוקן כש-Supabase לא מוגדר: ממשיכה בלי שמירה (ונעצרת על המפתח החסר של OpenAI, כצפוי).
  - העיצוב בדפדפן, ברוחב 375: כפתור החשבון לאורח ולמחובר, חלון הכניסה בשתי הלשוניות, "החשבון שלי", ושורת "נכתבה עכשיו בשבילך". החלון נסגר בלחיצה על הרקע.
- ה-migration `add_joke_authors` רץ ב-joke-app אחרי אישור, והצליח.
  - נבדק: שבע עמודות, ו-user_id ו-author_name לא חובה. ה-check וה-foreign key (‏on delete set null) קיימים, וגם האינדקס jokes_user_id_idx.
  - הנעילה לא השתנתה: RLS דולק, אין אף policy. ל-service_role רק insert, ‏select ו-update. ל-anon ול-authenticated אין כלום.
  - 11 השורות הקיימות נשארו, כולן בלי user_id ובלי author_name.
  - get_advisors (security): רק `rls_enabled_no_policy` ברמה INFO, על public.jokes. זה בכוונה, ולא מוסיפים policy.
  - get_advisors (performance): רק `unused_index` ברמה INFO, על jokes_user_id_idx. האינדקס חדש ועוד לא היה בשימוש. מחיקת החשבון תשתמש בו.
- עוד לא נבדק מול Supabase אמיתי: הרשמה, כניסה, טוקן לא מוכר ומחיקה. זה יקרה אחרי ה-SQL ואחרי `SUPABASE_PUBLISHABLE_KEY` ב-Vercel.

## הרצה
(יתמלא בשלב ההרצה)
