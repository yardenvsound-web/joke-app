# ARCHITECTURE: בדיחה בלחיצה

המסמך מתאר את המצב אחרי Milestone 6. מה שנוסף ב-Milestone 5, ב-Milestone 6 או בבונוס של Google מסומן כך. הפירוט המלא: spec/MILESTONES.md ו-spec/milestones-5-6.md.

## 1. מבנה המערכת בשלוש שכבות

### צד לקוח
- index.html אחד, עם ה-CSS וה-JavaScript בתוכו. עברית, `lang="he"` ו-`dir="rtl"`.
- הלוגו, ארבעת הציורים של הדמות והרקע הם קבצי SVG בתיקיית assets. הדף מחליף ביניהם לפי `data-state` על הבועה: idle, think, joke, error.
- טופס עם תיבה (maxlength 100) וכפתור. בשליחה: POST ל-/api/joke, ואז הצגת הבדיחה או ההודעה.
- כניסה (Milestone 5): auth.js בשורש מרכז את כל הכניסה בדפדפן. הספרייה @supabase/supabase-js נטענת מ-jsDelivr בגרסה קבועה, ומשמשת רק להרשמה, כניסה, התנתקות ושמירת הטוקן. flowType של pkce. כתובת הפרויקט והמפתח הציבורי מגיעים מ-/api/config, ולא כתובים בדף.
- auth.js חושף: ready, signUp(name, email, password) עם full_name ב-user_metadata, signIn, signOut ב-scope מקומי, session, token, onChange, והודעות שגיאה בעברית. בבונוס: google().
- כל קריאה ל-/api שולחת את הטוקן בכותרת Authorization, אם יש. תשובת 401 עם code: "auth_required" כשנשלח טוקן: הדף מתנתק לבד, וכותב "צריך להתחבר שוב".
- הצבעה (Milestone 6): רכיב אחד בכל מקום שיש בדיחה, "אהבתי" ו"לא אהבתי" עם מספרים. אורח שלוחץ: חלון הכניסה, ואחרי הכניסה ההצבעה נשלחת לבד.
- שלוש לשוניות (Milestone 6): ‎#joke, ‎#community, ‎#liked. רשימה נטענת כשנכנסים ללשונית, אחרי פעולה, ואחרי כניסה או יציאה. בלי polling.
- הדף מדבר רק עם /api. הוא לא קורא ולא כותב אף טבלה. הבקשות היחידות ל-supabase.co הן לנתיב /auth/v1, דרך הספרייה.
- כל טקסט מהשרת או מהמשתמש מוצג עם textContent, אף פעם לא innerHTML.
- רושם את sw.js כ-service worker.

### לוגיקה
- Vercel Functions בתיקיית api, כל אחת עם `export default { async fetch(request) { ... } }`. רק הן ניגשות לנתונים ב-Supabase.
- api/config.js (Milestone 5): GET בלבד. מחזירה `{ url, publishableKey }` מ-SUPABASE_URL ומ-SUPABASE_PUBLISHABLE_KEY. אחד חסר, או שהמפתח במשתנה הוא מפתח סודי: 500 עם code: "auth_not_configured". אף פעם לא מחזירה מפתח סודי.
- api/joke.js: מקבלת רק POST עם `{ "topic": "..." }`. חותכת את הנושא ל-100 תווים. נושא ריק או גוף שבור נחשבים "אין נושא". אם יש טוקן, מזהה את המשתמש לפני הקריאה ל-OpenAI: טוקן ש-Supabase לא מכיר מחזיר 401 עם auth_required, בלי לפנות ל-OpenAI. Supabase לא זמין: הבדיחה מגיעה בלי שמירה. בשמירה: user_id ו-author_name מהטוקן. מחזירה `{ joke, id, author_name }`, ו-author_name הוא null לאורח.
- api/feed.js (Milestone 6): GET עם mode של new, top או liked. new ו-top גם לאורח. liked רק עם טוקן, אחרת 401. קוראת ל-joke_feed דרך rpc. 20 שורות ל-new, 10 ל-top, 50 ל-liked. אף פעם לא מחזירה user_id.
- api/vote.js (Milestone 6): POST עם טוקן בלבד. הגוף `{ id, value }`: id הוא uuid, ו-value הוא 1, 1- או 0 בדיוק, כמספר. קוראת ל-cast_vote דרך rpc, עם voter מהטוקן. user_id בגוף לא נחשב. בדיחה שלא קיימת: 404.
- api/delete-account.js (Milestone 5): POST עם טוקן בלבד. קודם מנקה את author_name בבדיחות של המשתמש, ואז supabase.auth.admin.deleteUser. הבדיחות נשארות בלי שם ובלי בעלים, וההצבעות נמחקות ב-cascade.
- api/laugh.js ו-api/top.js מ-Milestone 4 נמחקים ב-Milestone 6. feed.js מחליפה את top.js.
- lib/supabase.js: הלקוח היחיד עם המפתח הסודי, מ-@supabase/supabase-js, עם `process.env.SUPABASE_URL` ו-`process.env.SUPABASE_SECRET_KEY`. נמצא מחוץ ל-api, כדי שלא יקבל כתובת משלו. ב-Milestone 5 נוספות: hasToken(request), getUserFromRequest(request, supabase) שמחזירה את המשתמש או null וזורקת שגיאה כש-Supabase לא זמין, ו-displayName(user) שמחזירה את user_metadata.full_name עד 30 תווים.
- זיהוי משתמש: רק עם supabase.auth.getUser(token), על הטוקן מהכותרת Authorization. מזהה משתמש או שם שמגיעים מהדף לא נחשבים.
- lib/http.js (Milestone 5): תשובת JSON עם Cache-Control: no-store, תשובת 401 עם code: "auth_required", וקריאת גוף עם מגבלת גודל.
- כל פונקציה מחזירה תמיד JSON, ו-`{ "error": "..." }` בשגיאה.

### נתונים
Supabase, פרויקט אחד, שתי טבלאות: public.jokes ו-public.votes (מ-Milestone 6), ומשתמשים ב-Supabase Auth (auth.users). רק הפונקציות ב-api ניגשות לטבלאות, עם המפתח הסודי.

## 2. מבנה הנתונים
טבלה public.jokes (migration בשם create_jokes, ועותק בקובץ db/create_jokes.sql. העמודות user_id ו-author_name ב-migration בשם add_joke_authors, ועותק ב-db/add_joke_authors.sql):

| עמודה | סוג | הערות |
|---|---|---|
| id | uuid | מפתח ראשי, ברירת מחדל gen_random_uuid() |
| created_at | timestamptz | ברירת מחדל now() |
| topic | text | הנושא אחרי החיתוך. יכול להיות ריק |
| text | text | חובה. הבדיחה |
| laughs | integer | חובה, ברירת מחדל 0. מ-Milestone 6 האפליקציה לא משתמשת בה, אבל היא נשארת |
| user_id | uuid | Milestone 5. לא חובה. references auth.users (id) on delete set null. אינדקס |
| author_name | text | Milestone 5. לא חובה. null, או בין 1 ל-30 תווים אחרי btrim |

טבלה public.votes (Milestone 6, migration בשם create_votes, ועותק ב-db/create_votes.sql):

| עמודה | סוג | הערות |
|---|---|---|
| user_id | uuid | חובה. references auth.users (id) on delete cascade |
| joke_id | uuid | חובה. references public.jokes (id) on delete cascade. אינדקס |
| value | smallint | חובה. 1 או 1- בלבד |
| voted_at | timestamptz | חובה, ברירת מחדל now() |

- המפתח הראשי של votes: (user_id, joke_id). זה מה שמבטיח קול אחד לכל משתמש לכל בדיחה.

נעילה, בכל הטבלאות:
- RLS דולק, בלי אף policy.
- grant רק ל-service_role: על jokes, ‏select, insert, update. על votes, ‏select, insert, update, delete. מ-30.10.2026 Supabase לא נותנת הרשאות אוטומטית לטבלה חדשה, ולכן ה-grant כתוב במפורש.
- revoke all מ-anon ומ-authenticated. גם משתמש מחובר לא ניגש לטבלה ישירות.
- הצעה של Supabase להוסיף policy או grant ל-anon לא מתקבלת.

פונקציות בבסיס הנתונים. בכולן: security invoker, ‏`set search_path = ''`, שמות מלאים, revoke execute מ-public, anon ו-authenticated, ו-grant execute ל-service_role.
- public.add_laugh(joke_id uuid) מ-Milestone 4: נשארת בבסיס הנתונים, אבל מ-Milestone 6 האפליקציה לא קוראת לה.
- public.cast_vote(voter uuid, target uuid, new_value smallint), ‏plpgsql (Milestone 6): 1 או 1-: insert עם on conflict (user_id, joke_id) do update של value ו-voted_at. 0: מוחקת את ההצבעה. כל ערך אחר: שגיאה. מחזירה שורה אחת: likes, dislikes ו-my_vote של הבדיחה.
- public.joke_feed(viewer uuid, mode text, max_rows integer default 20), ‏sql, ‏stable (Milestone 6): מחזירה id, created_at, topic, text, author_name, likes, dislikes ו-my_vote. new: לפי created_at מהחדש. top: רק בדיחות עם like אחד לפחות, לפי likes פחות dislikes, ואז לפי likes. liked: רק בדיחות ש-viewer סימן בהן 1, לפי voted_at. viewer הוא null לאורח. max_rows בין 1 ל-50.

כל SQL נשמר קודם כקובץ בתיקייה db, מוצג לפני ההרצה, ורץ דרך המחבר של Supabase רק אחרי אישור. אחרי ההרצה: get_advisors והסבר בעברית.

החוזה בין הדף לפונקציות, אחרי Milestone 6:

| הפונקציה | בקשה | טוקן | תשובה |
|---|---|---|---|
| /api/config | GET | לא | `{ url, publishableKey }` |
| /api/joke | POST `{ topic }` | רשות | `{ joke, id, author_name }` |
| /api/feed?mode=new או top | GET | רשות | `{ jokes: [{ id, topic, text, author_name, likes, dislikes, my_vote, created_at }] }` |
| /api/feed?mode=liked | GET | חובה | כמו למעלה |
| /api/vote | POST `{ id, value }` | חובה | `{ likes, dislikes, my_vote }` |
| /api/delete-account | POST | חובה | `{ deleted: true }` |

- שגיאה: `{ error: "הודעה קצרה בעברית" }`, עם 400, 401, 404, 405, 500 או 502. כשצריך להתחבר: 401 עם `{ error, code: "auth_required" }`.
- כל התשובות עם Cache-Control: no-store, כי הן תלויות במי ששואל.

## 3. התחברות והרשאות
רמה 3 לפי course-stack.md: משתמשים אמיתיים עם הרשמה עצמית, ב-Supabase Auth (Milestone 5).
- אורח: מבקש בדיחות וקורא את הקהילה (new ו-top). כדי להצביע ולראות את "אהבתי" צריך חשבון.
- הרשמה וכניסה עם מייל וסיסמה (6 תווים לפחות), ושם לתצוגה עד 30 תווים ב-user_metadata.full_name. בבונוס: כניסה עם Google.
- בדשבורד של Supabase: Allow new users to sign up דולק, ו-Confirm email כבוי. Site URL היא הכתובת ב-Vercel, וב-Redirect URLs אותה כתובת עם /** בסוף, וגם http://localhost:3000/** להרצה מקומית.
- הדף שולח את טוקן הגישה בכותרת Authorization. כל פונקציה שצריכה לדעת מי שואל מזהה את המשתמש רק עם supabase.auth.getUser(token), ומסננת לפי המזהה שקיבלה מהאימות.
- כתובת הפרויקט והמפתח הציבורי מגיעים לדף רק בשביל הכניסה. הם לא פותחים אף טבלה, כי ל-anon ול-authenticated אין grant.
- מחיקת חשבון: המשתמש מוחק את עצמו דרך api/delete-account, כי מחיקה ב-Supabase Auth דורשת את המפתח הסודי.
- ההגנה על העלות: אורך נושא מוגבל, ומגבלת הוצאה בחשבון OpenAI.

## 4. שכבת ה-AI
- הקריאה: POST אל `https://api.openai.com/v1/responses`, מתוך הפונקציה בלבד, עם הכותרת `Authorization: Bearer <OPENAI_API_KEY>`.
- הגוף: `model` מ-OPENAI_MODEL או `gpt-5`, ‏`instructions` עם הפרומפט המרכזי, `input` עם הנושא, ‏`reasoning: { effort: "low" }` ו-`max_output_tokens`.
- הפרומפט המרכזי: "אתה כותב בדיחות קצרות בעברית. כתוב בדיחה אחת בלבד, עד ארבעה משפטים, נקייה ומתאימה לכל גיל. בלי הקדמה, בלי הסבר ובלי אימוג׳י. רק הבדיחה."
- ה-input: "נושא הבדיחה: [הנושא]". בלי נושא: "אין נושא. ספר בדיחה כללית על החיים."
- התשובה: לוקחים את `output_text` אם קיים. אחרת, את הטקסט מהפריטים מסוג `message` במערך `output`, בחלקים מסוג `output_text`. אין טקסט: שגיאה.
- שגיאה מ-OpenAI: הסטטוס והקוד נרשמים ב-console.error, והדף מקבל הודעה קצרה בעברית לפי הקוד: 401, נגמר הקרדיט, מגבלת הוצאה, 429, 404.
- למודל נשלח רק הנושא. השם, המייל ושאר פרטי המשתמש לא נשלחים ל-OpenAI.
- לפני כתיבת הקוד בודקים בתיעוד העדכני של OpenAI ושל Vercel את מבנה הבקשה והתשובה.

## 5. אינטגרציות, APIs ואוטומציות
- OpenAI Responses API, מ-api/joke.js.
- Supabase, דרך @supabase/supabase-js: הנתונים רק מהפונקציות ב-api, עם המפתח הסודי. בדפדפן הספרייה משמשת רק ל-Supabase Auth, בנתיב /auth/v1. אין בקשות מהדפדפן ל-/rest/v1.
- בונוס: Google כספק OAuth ב-Supabase Auth. הדף בודק ב-/auth/v1/settings, שהיא ציבורית ועונה עם המפתח הציבורי, ש-Google דולק לפני היציאה.
- אין אוטומציות ואין שירותים נוספים.

## 6. מפתחות וסודות
| השם | איפה | סוג | מה הוא |
|---|---|---|---|
| OPENAI_API_KEY | Vercel, Environment Variables, ב-Production וב-Preview | Secret | מפתח ה-production, ‏joke-in-a-click. רק הפונקציה קוראת אותו |
| OPENAI_API_KEY | .env.local במחשב, רק בהרצה מקומית | קובץ שלא נכנס לריפו | מפתח dev נפרד, ‏joke-in-a-click-dev. הסטודנט מדביק אותו ביד |
| OPENAI_MODEL | Vercel, Environment Variables | Config, לא חובה | שם המודל. בלי המשתנה: gpt-5 |
| SUPABASE_URL | Vercel, Environment Variables, בכל הסביבות | Config | כתובת הפרויקט ב-Supabase |
| SUPABASE_SECRET_KEY | Vercel, Environment Variables, ב-Production וב-Preview | Secret | המפתח הסודי של Supabase. רק lib/supabase.js קורא אותו |
| SUPABASE_PUBLISHABLE_KEY | Vercel, Environment Variables, בכל הסביבות | Config. חדש ב-Milestone 5 | המפתח הציבורי, בשביל הכניסה בדף. הוא לא סוד, ו-Claude יכול להביא אותו עם get_publishable_keys |
| SUPABASE_URL, SUPABASE_SECRET_KEY | .env.local במחשב, רק בהרצה מקומית | קובץ שלא נכנס לריפו | מודבקים ביד |
| Client Secret של Google | רק בדשבורד של Supabase, בספק Google | בונוס | לא בקוד, לא בריפו ולא ב-Vercel |

- מפתח סודי לא מופיע בשום קובץ שנכנס לריפו, ולא בצ׳אט עם Claude. היחיד: .env.local במחשב, למי שמריץ מקומית.
- מפתח ה-production נשמר ב-Vercel כבר ב-Milestone 1. אחרי כל שינוי במשתנה: Redeploy.
- .claude/settings.json חוסם ל-Claude את הקריאה של .env ושל .env.*. בריפו יש .env.example עם שתי שורות בלבד: OPENAI_API_KEY= ו-SUPABASE_SECRET_KEY=, בלי ערכים. הוא לא משתנה ב-Milestone 5: המפתח הציבורי אינו סוד, ולכן הוא לא בקובץ. ב-.env.local מדביקים ביד את הערכים, ולמי שמריץ מקומית גם את SUPABASE_URL ואת SUPABASE_PUBLISHABLE_KEY. שם המודל לא נכנס לקובץ: בלי OPENAI_MODEL הקוד משתמש ב-gpt-5.
- הדפדפן לא מקבל אף מפתח סודי. הוא מקבל מ-/api/config רק את הכתובת ואת המפתח הציבורי. ב-Ctrl+U אין sb_publishable_ ואין sb_secret_.
- .gitignore כולל `.env`, ‏`.env.*`, את החריגה `!.env.example`, ‏`.vercel` ו-`node_modules`. הוא נוצר לפני הקומיט הראשון.
- בחשבון OpenAI: קרדיט מראש, Auto recharge כבוי, ומגבלת הוצאה חודשית.

## 7. מבנה התיקיות של הקוד
```
index.html              המסך, עם ה-CSS וה-JavaScript
auth.js                 Milestone 5. כל הכניסה בדפדפן, דרך Supabase Auth
manifest.webmanifest    name, short_name, start_url, display: standalone, lang: he, dir: rtl, אייקונים
sw.js                   service worker, network-first, בלי /api
package.json            "type": "module", ‏dependencies: @supabase/supabase-js בלבד
.gitignore              .env, .env.*, !.env.example, .vercel, node_modules
.env.example            שתי שורות בלבד: OPENAI_API_KEY= ו-SUPABASE_SECRET_KEY=, בלי ערכים ובלי הערות
.claude/settings.json   חוסם ל-Claude את הקריאה של .env ושל .env.*
assets/logo.svg
assets/mascot-idle.svg, mascot-think.svg, mascot-joke.svg, mascot-error.svg
assets/bg-dots.svg, bg-doodles.svg
assets/icon.svg, icon-maskable.svg
assets/icon-192.png, icon-512.png, icon-512-maskable.png
api/config.js           Milestone 5. הכתובת והמפתח הציבורי, בשביל הכניסה
api/joke.js             בדיחה מ-OpenAI, ושמירה בטבלה עם הכותב. המקום היחיד שקורא את מפתח OpenAI
api/feed.js             Milestone 6. רשימות הקהילה: new, top ו-liked
api/vote.js             Milestone 6. הצבעה אחת, דרך rpc ל-cast_vote
api/delete-account.js   Milestone 5. מחיקת החשבון של המשתמש המחובר
lib/supabase.js         הלקוח היחיד של Supabase. המקום היחיד שקורא את SUPABASE_SECRET_KEY. וגם hasToken, getUserFromRequest, displayName
lib/http.js             Milestone 5. עזרים לתשובות JSON, ל-401 ולקריאת הגוף
db/create_jokes.sql     עותק של ה-migration create_jokes
db/tighten_jokes_grants.sql  עותק של ה-migration tighten_jokes_grants: ל-service_role רק select, insert, update
db/add_joke_authors.sql Milestone 5. user_id ו-author_name ב-jokes
db/create_votes.sql     Milestone 6. הטבלה votes, ‏cast_vote ו-joke_feed
spec/                   מסמכי האיפיון, ו-spec/plans
```
api/laugh.js ו-api/top.js מ-Milestone 4 נמחקים ב-Milestone 6.

ה-service worker:
- באירוע install שומר במטמון את /, את ה-manifest, את /auth.js (מ-Milestone 5), את קבצי ה-SVG מתיקיית assets ואת שני האייקונים.
- בכל בקשת GET מאותה כתובת: קודם רשת, ושומר עותק. אין רשת: מחזיר מהמטמון.
- בקשה ל-/api, בקשה שאינה GET, או בקשה לכתובת אחרת: לא נוגע בה. כך הרשימות תמיד עדכניות, והספרייה מ-jsDelivr והבקשות ל-supabase.co לא נשמרות.
- שם המטמון כולל גרסה (joke-v2 מ-Milestone 4). כל שינוי בקבצים שנשמרים מראש מעלה את הגרסה, והגרסה הישנה נמחקת ב-activate. Milestone 5 ו-Milestone 6 מעלים אותה.

## הנחות והחלטות
- בלי ai-tests.md. במקומו, חמש בדיקות ידניות בתנאי ההשלמה של Milestone 2. המוצר קטן, והפלט הוא טקסט חופשי.
- שני גופנים מ-Google Fonts, Fredoka ו-Playpen Sans Hebrew, עם גיבוי ל-system-ui. ה-service worker לא שומר אותם, כי הם מכתובת אחרת.
- CSS ו-JavaScript של המסך בתוך index.html. רק הכניסה יוצאת ל-auth.js, כדי שתהיה במקום אחד.
- `reasoning: { effort: "low" }` כדי שהבדיחה תחזור מהר. אם התיעוד העדכני לא תומך בשדה הזה במודל שנבחר, מורידים אותו.
- הפונקציה כותבת console.log קצר לכל בדיחה (הנושא והמודל), כדי לראות פניות ב-Logs.
- Milestone 6: שתי טבלאות ב-Supabase, jokes ו-votes, בתוך המגבלה של עד שלוש טבלאות. המשתמשים עצמם ב-auth.users, ולא בטבלה שלנו.
- העמודה laughs והפונקציה add_laugh נשארות, כדי לא למחוק נתונים. האפליקציה פשוט מפסיקה להשתמש בהן.
- Confirm email כבוי, כדי לא להזדקק ל-SMTP מותאם (Resend). שחזור סיסמה מחוץ לטווח.
