# CLAUDE.md: בדיחה בלחיצה

הוראות קבועות לכל שיחה בפרויקט הזה.

## הפרויקט
- אפליקציית "בדיחה בלחיצה": כותבים נושא ומקבלים בדיחה מ-GPT-5, דרך פונקציה ב-Vercel.
- שמירה: Supabase. רק הפונקציות בתיקיית `api` ניגשות לנתונים, דרך לקוח אחד ב-`lib/supabase.js`, עם המפתח הסודי. הדף מדבר רק עם `/api`, ולא קורא ולא כותב אף טבלה.
- כניסה (מ-Milestone 5): Supabase Auth, רמה 3 לפי course-stack.md, משתמשים אמיתיים עם הרשמה עצמית.
  - בדפדפן, הספרייה של Supabase משמשת רק לכניסה (`auth.js`). הכתובת והמפתח הציבורי מגיעים מ-`/api/config`, ולא כתובים בקוד הדף.
  - הדף שולח את טוקן הגישה בכותרת `Authorization`.
  - הפונקציות מזהות משתמש רק עם `supabase.auth.getUser(token)`. מזהה משתמש או שם שמגיעים מהדף לא נחשבים.
- האפליקציה בעברית, מימין לשמאל (`lang="he"`, `dir="rtl"`).
- מסמכי הספק נמצאים ב-`spec/`, והם מקור האמת: PRD.md, MVP.md, MILESTONES.md, milestones-5-6.md, ARCHITECTURE.md, DESIGN.md, tech-stack.md, product-10-definitions.md ו-course-stack.md, וגם תמונות הייחוס (wireframes, mockups, style-guide).
- `assets/` נשארת בשורש, כי האפליקציה משתמשת בה. משתמשים בקבצים כמו שהם.
- course-stack.md קובע את הסטאק. לא חורגים ממנו בלי לשאול.

## איך מנחים אותי
- בכל שלב: מסבירים לי צעד אחר צעד מה הצעד הבא. בקצרה, לעניין ובבירור.
- לפני שאלות: קוראים קודם את הקבצים, ורק אז מחדדים איתי את מה שנשאר פתוח.

## מפתחות: חוק ברזל
- לא מבקשים ממני אף מפתח.
- לא כותבים מפתח ולא קוראים מפתח, באף קובץ.
- את מפתח ה-production אני שומר/ת ב-Vercel (Secret, בסביבות Production ו-Preview). כך גם את `SUPABASE_SECRET_KEY` (Secret) ואת `SUPABASE_URL` (Config).
- `SUPABASE_PUBLISHABLE_KEY` נשמר ב-Vercel מסוג Config, בכל הסביבות (מ-Milestone 5). הוא לא סוד: Claude רשאי להביא אותו עם get_publishable_keys. הוא לא נכנס ל-`.env.example`.
- את מפתח ה-dev, ואת משתני Supabase להרצה מקומית, אני מדביק/ה בעצמי ב-`.env.local`.
- `.claude/settings.json` חוסם קריאה של `.env` ושל `.env.*`. אסור לעקוף את החסימה.
- `.env.example` מכיל רק שתי שורות: `OPENAI_API_KEY=` ו-`SUPABASE_SECRET_KEY=`, בלי ערכים ובלי הערות.
- `.gitignore` מתעלם מ-`.env`, מ-`.env.*` (עם החריגה `!.env.example`), מ-`.vercel` ומ-`node_modules`. לפני כל commit בודקים ששלושת הקבצים האלה קיימים.

## Git, GitHub ו-Vercel
- ריפו ציבורי: https://github.com/yardenvsound-web/joke-app, על ענף main בלבד.
- הלינק החי נמצא ב-Vercel, לא ב-GitHub Pages. ב-Milestone 1 מנחים אותי לייבא את הריפו ל-Vercel ולשמור שם את המפתח. מאותו רגע, כל push מתעדכן לבד.
- בסוף כל שלב נותנים לי את הלינק החי.

## עבודה במיילסטונים
- בונים לפי `spec/MILESTONES.md`, מיילסטון אחד בכל פעם. לכל מיילסטון יש שיחה חדשה, באותו שם כמו הקובץ שלו (milestone-1 וכן הלאה).
- לכל מיילסטון ארבעה שלבים:
  1. **תכנון**
  2. **בנייה**
  3. **הרצה**, כדי שאוכל לבדוק: בכתובת ב-Vercel, או במחשב עם `vercel dev` (http://localhost:3000). אני בוחר/ת איפה.
  4. **דחיפה**, ואחריה הלינק החי.
- את התכנון ואת הבנייה של כל מיילסטון מתעדים בקובץ `spec/plans/milestone-N.md`.
- בסוף כל מיילסטון עוצרים, ומחכים לבדיקה שלי ולאישור מפורש לפני שממשיכים.

## המלצת מודל
- הקמה, Milestone 2 ו-Milestone 3: Sonnet.
- Milestone 1: Opus, כי הוא כולל את בניית המסך לפי ה-mockups.

## החלטות שכבר התקבלו
- Supabase: טבלה public.jokes, ‏RLS דולק בלי policy, ‏grant רק ל-service_role, ‏revoke all מ-anon ומ-authenticated. מונה הצחוקים עובר דרך הפונקציה public.add_laugh ב-rpc. לא מקבלים הצעה להוסיף policy או grant ל-anon.
- מ-Milestone 6: גם public.votes נעולה באותה צורה. ההצבעות עוברות דרך public.cast_vote, והרשימות דרך public.joke_feed, שתיהן ב-rpc. laughs ו-add_laugh נשארים בבסיס הנתונים, בלי שימוש.
- שינויי SQL נשמרים גם בתיקיית `db/`, ומוצגים לי לפני ההרצה.
- בכל שינוי בקבצים ש-sw.js שומר מראש, מעלים את גרסת המטמון.
- לא יוצרים את `ai-tests.md`. לפי ARCHITECTURE.md, במקומו יש בדיקות ידניות בתנאי ההשלמה של Milestone 2.
- `joke-app-spec.zip` נשאר במחשב ולא נכנס לריפו.
- שאלות פתוחות לתכנון של Milestone 2 (מתוך product-10-definitions.md):
  - מה עושים כשהמודל מסרב.
  - האם מגבלת ההוצאה מספיקה כהגנה.
  - האם בסדר שאותו נושא יחזיר אותה בדיחה.
