# Milestone 6: הקהילה מדרגת

## המטרה
"אהבתי" ו"לא אהבתי" במקום "צחקתי". קול אחד לכל משתמש לכל בדיחה, לשונית קהילה (חדשות והכי מצחיקות), ולשונית אהבתי. אורח קורא ורואה מספרים, אבל כדי לדרג צריך חשבון. הדף ממשיך לדבר רק עם /api.

## תכנון

### המצב לפני
- פרויקט Supabase: joke-app (ref `kydooupmuxucvdcconua`). migrations שרצו: `create_jokes`, ‏`tighten_jokes_grants`, ‏`add_joke_authors`.
- ב-public.jokes יש 13 שורות. ל-3 מהן יש laughs גדול מ-0. משתמש רשום אחד, ובדיחה אחת שלו.
- אין עדיין טבלה public.votes.
- `sw.js` בגרסה `joke-v3`. הפונקציות: config, ‏joke, ‏delete-account, ‏laugh ו-top.
- ב-index.html: כפתור "צחקתי" בבועה, ורשימת "הכי מצחיקות" מתחת. כל קריאה עוברת ב-`api()`.

### העצירות במיילסטון
1. **ה-SQL**: מוצג לך, ורץ רק אחרי אישור. אחריו get_advisors, הסבר ועצירה. אתה בודק שהטבלה נעולה.
2. **בנייה** של הפונקציות והדף.
3. **הרצה ובדיקה שלך** (Vercel או `vercel dev`, לבחירתך), ורק אז דחיפה.
- ביד: אין משתנים חדשים ב-Vercel ואין שינוי בדשבורד.

### הקבצים שמשתנים
| קובץ | מה משתנה |
|---|---|
| `db/create_votes.sql` | קובץ חדש: הטבלה, הנעילה, ‏cast_vote ו-joke_feed |
| `api/vote.js` | קובץ חדש |
| `api/feed.js` | קובץ חדש. מחליף את top.js |
| `api/laugh.js`, ‏`api/top.js` | נמחקים |
| `index.html` | רכיב הצבעה, שלוש לשוניות עם #, מסך קהילה, מסך אהבתי, הצבעה שמחכה לכניסה |
| `sw.js` | ‏`joke-v4` |
| `api/delete-account.js` | בלי שינוי. ההצבעות נמחקות לבד (on delete cascade) |
| `lib/*`, ‏`auth.js`, ‏`api/joke.js`, ‏`api/config.js` | בלי שינוי |

### ה-SQL: ‏db/create_votes.sql
```sql
-- migration: create_votes
-- קול אחד לכל משתמש לכל בדיחה. רק השרת (service_role) ניגש.
-- laughs ו-add_laugh נשארים בבסיס הנתונים, בלי שימוש.

create table public.votes (
  user_id  uuid        not null references auth.users (id) on delete cascade,
  joke_id  uuid        not null references public.jokes (id) on delete cascade,
  value    smallint    not null check (value in (-1, 1)),
  voted_at timestamptz not null default now(),
  primary key (user_id, joke_id)
);

create index votes_joke_id_idx on public.votes (joke_id);

-- RLS דולק, בלי אף policy
alter table public.votes enable row level security;

-- רק service_role, ורק ארבע ההרשאות. revoke קודם, כי ברירת המחדל של הפרויקט נותנת יותר.
revoke all on table public.votes from anon, authenticated, service_role;
grant select, insert, update, delete on table public.votes to service_role;

-- הצבעה: 1 או -1 שומרים (או מחליפים), 0 מוחק. מחזירה את המספרים של הבדיחה.
create function public.cast_vote(voter uuid, target uuid, new_value smallint)
returns table (likes integer, dislikes integer, my_vote smallint)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if voter is null then
    raise exception 'voter is required' using errcode = '22004';
  end if;
  if new_value is null or new_value not in (-1, 0, 1) then
    raise exception 'invalid vote value' using errcode = '22023';
  end if;
  if not exists (select 1 from public.jokes j where j.id = target) then
    raise exception 'joke not found' using errcode = 'P0002';
  end if;

  if new_value = 0 then
    delete from public.votes v where v.user_id = voter and v.joke_id = target;
  else
    insert into public.votes as v (user_id, joke_id, value)
    values (voter, target, new_value)
    on conflict (user_id, joke_id)
    do update set value = excluded.value, voted_at = now();
  end if;

  return query
    select
      (count(*) filter (where v.value = 1))::integer,
      (count(*) filter (where v.value = -1))::integer,
      (select m.value from public.votes m where m.user_id = voter and m.joke_id = target)
    from public.votes v
    where v.joke_id = target;
end;
$$;

-- רשימה: new מהחדשה, top לפי (likes - dislikes) ואז likes, liked לפי מתי אהבתי.
-- viewer הוא null לאורח. max_rows בין 1 ל-50.
create function public.joke_feed(viewer uuid, mode text, max_rows integer default 20)
returns table (
  id uuid, created_at timestamptz, topic text, text text, author_name text,
  likes integer, dislikes integer, my_vote smallint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with tally as (
    select v.joke_id,
           (count(*) filter (where v.value = 1))::integer  as likes,
           (count(*) filter (where v.value = -1))::integer as dislikes
    from public.votes v
    group by v.joke_id
  ),
  mine as (
    select v.joke_id, v.value, v.voted_at
    from public.votes v
    where viewer is not null and v.user_id = viewer
  )
  select j.id, j.created_at, j.topic, j.text, j.author_name,
         coalesce(t.likes, 0), coalesce(t.dislikes, 0), m.value
  from public.jokes j
  left join tally t on t.joke_id = j.id
  left join mine  m on m.joke_id = j.id
  where case mode
          when 'new'   then true
          when 'top'   then coalesce(t.likes, 0) >= 1
          when 'liked' then m.value = 1
          else false
        end
  order by
    case when mode = 'liked' then m.voted_at end desc nulls last,
    case when mode = 'top' then coalesce(t.likes, 0) - coalesce(t.dislikes, 0) end desc nulls last,
    case when mode = 'top' then coalesce(t.likes, 0) end desc nulls last,
    j.created_at desc
  limit least(greatest(coalesce(max_rows, 20), 1), 50);
$$;

revoke execute on function public.cast_vote(uuid, uuid, smallint) from public, anon, authenticated;
grant  execute on function public.cast_vote(uuid, uuid, smallint) to service_role;
revoke execute on function public.joke_feed(uuid, text, integer) from public, anon, authenticated;
grant  execute on function public.joke_feed(uuid, text, integer) to service_role;
```
- למה כך:
  - המפתח הראשי (user_id, joke_id) הוא מה שמבטיח קול אחד. עשרים לחיצות באותו רגע נגמרות בשורה אחת.
  - קודי השגיאה מאפשרים לפונקציה ב-api להחזיר את הסטטוס הנכון: ‏P0002 הוא 404, ‏22023 הוא 400.
  - ב-jokes לא משתנה כלום: אין grant חדש, אין policy, ו-service_role עדיין בלי delete.
- אחרי ההרצה:
  - בדיקה: RLS דולק ואין policy על votes. ל-anon ול-authenticated אין הרשאות על הטבלה ואין execute על הפונקציות. ל-service_role רק ארבע ההרשאות.
  - get_advisors (security ו-performance), הסבר בעברית, ועצירה.

### api/vote.js
- POST בלבד (אחרת 405). בלי טוקן: ‏401 auth_required ("צריך להתחבר כדי לדרג.").
- הגוף דרך `readJson`: ‏`id` מחרוזת uuid, ו-`value` מסוג number, בדיוק 1, ‏1- או 0. אחרת: ‏400 ("ההצבעה הזו לא תקינה."). שדה `user_id` בגוף פשוט לא נקרא.
- המשתמש רק מ-`getUserFromRequest`. טוקן לא מוכר: ‏401. ‏Supabase לא זמין: ‏500.
- `supabase.rpc("cast_vote", { voter: user.id, target: id, new_value: value })`.
- שגיאות: ‏P0002 ‏→ 404 ("הבדיחה הזו לא נמצאה."). ‏22023 ‏→ 400. ‏23503 (המשתמש נמחק בינתיים) ‏→ 401. אחר: ‏500.
- מחזירה `{ likes, dislikes, my_vote }`. ‏`my_vote` הוא 1, ‏1- או null.

### api/feed.js
- GET בלבד. ‏`mode` מ-query string: ‏new, ‏top או liked. אחר: ‏400.
- כמות: new ‏20, ‏top ‏10, ‏liked ‏50.
- הטוקן:
  - liked: חובה. בלי טוקן או טוקן לא מוכר: ‏401.
  - new ו-top: רשות. יש טוקן: מזהים, כדי להחזיר את `my_vote`. טוקן לא מוכר: ‏401 (כמו ב-joke.js, והדף מתנתק לבד). אין טוקן: ‏viewer הוא null.
- `supabase.rpc("joke_feed", { viewer, mode, max_rows })`.
- מחזירה `{ jokes: [{ id, topic, text, author_name, likes, dislikes, my_vote, created_at }] }`. השדות נבחרים אחד אחד, ואף פעם לא user_id.

### index.html
- **לשוניות**: סרגל צף בתחתית, כרטיס לבן אחד עם שלוש לשוניות: בדיחה (פרצוף מחייך), קהילה (שני אנשים), אהבתי (לב). הפעילה ברקע הדיו ובטקסט לבן, עם `aria-current="page"`.
  - כל לשונית היא קישור ל-`#joke`, ‏`#community` או `#liked`. ‏`hashchange` מחליף את המסך. כתובת בלי # או # לא מוכר: ‏#joke. כך כפתור החזרה של הטלפון עובר בין הלשוניות.
  - כניסה ללשונית קהילה או אהבתי טוענת את הרשימה. אין טיימר.
- **רכיב הצבעה אחד**: פונקציה `voteControls(joke)` שמחזירה שני כפתורי גלולה: "אהבתי" עם אגודל למעלה ו"לא אהבתי" עם אגודל למטה, וליד כל אחד המספר.
  - הסימון שלי: ‏`aria-pressed="true"`, רקע מנטה ל"אהבתי" או ורוד ל"לא אהבתי", ואייקון מלא במקום קו.
  - לחיצה: הערך החדש הוא 0 אם לחצתי על מה שכבר מסומן, אחרת 1 או 1-. בזמן הבקשה שני הכפתורים `disabled`. התשובה מעדכנת את המספרים ואת הסימון. כישלון: המצב הקודם חוזר, והודעה קצרה ליד.
  - האייקונים: SVG קטנים בתוך הדף (אגודלים, לב, אנשים, פרצוף). תיקיית assets לא משתנה.
- **אורח שלוחץ על הצבעה**: נשמרת בזיכרון הצבעה שמחכה (`{ id, value }`), ונפתח חלון הכניסה עם שורה מעל הטופס: "כדי לדרג בדיחות צריך חשבון". אחרי כניסה או הרשמה: ההצבעה נשלחת לבד, והרשימה הפתוחה נטענת מחדש. החלון נסגר בלי כניסה: ההצבעה שמחכה נמחקת.
- **לשונית בדיחה**: המסך הקיים. במקום "צחקתי": רכיב ההצבעה מתחת לבדיחה, עם 0 ו-0 לבדיחה חדשה (רק כשיש id). מתחת לבועה קישור קטן "לבדיחות של כולם" ל-#community. הרשימה "הכי מצחיקות" יוצאת מהמסך הזה.
- **לשונית קהילה**: כותרת "הקהילה" עם אייקון, ושורה "בדיחות שכולם ביקשו. מדרגים, והטובות עולות למעלה." מתג של שני מיונים, "חדשות" ו"הכי מצחיקות" (`aria-pressed`).
  - כרטיס: הבדיחה בכתב יד בגודל 19, תגית מקווקוות עם הנושא, "של" והשם או "בדיחה אנונימית", ורכיב ההצבעה. הכרטיסים מסובבים קצת לסירוגין.
  - ב"הכי מצחיקות": עיגול צבעוני עם מספר הדירוג על פינת הכרטיס.
  - ריק: ב"חדשות" "עוד אין פה בדיחות. בקשו אחת בלשונית בדיחה." וב"הכי מצחיקות" "עוד אף בדיחה לא קיבלה אהבתי."
- **לשונית אהבתי**: כותרת "אהבתי" עם לב, ושורה "כל הבדיחות שאהבתם, במקום אחד."
  - אורח: מסך נעול עם הדמות, "כדי לשמור בדיחות שאהבתם צריך חשבון", וכפתור "כניסה" שפותח את החלון.
  - מחובר: הכרטיסים, באותו מבנה. הצבעה שמשאירה את my_vote שונה מ-1 (ביטול או "לא אהבתי") מוציאה את הכרטיס מהרשימה.
  - ריק: "עוד לא אהבתם אף בדיחה. לחצו על אהבתי בקהילה."
- **כניסה ויציאה** (`Auth.onChange`): הרשימה הפתוחה נטענת מחדש. בלשונית בדיחה, ביציאה, הסימון שלי יורד (המספרים נשארים).
- נמחקים: `loadTop`, ‏`laughButton` והעיצוב של `.laugh` ו-`.top`. כל טקסט מהשרת עם `textContent`.

### sw.js
- ‏`CACHE = "joke-v4"`, כי index.html (‏`/`) נשמר מראש. הרשימה לא משתנה.

### החלטות קטנות שלקחתי
- ה-laughs הישנים לא עוברים להצבעות: אין להם משתמש. לכן "הכי מצחיקות" יתחיל ריק עד ה"אהבתי" הראשון. כך המפרט: לא מוחקים, פשוט מפסיקים להשתמש.
- ההצבעה שמחכה נשמרת רק בזיכרון. sessionStorage מגיע עם הבונוס של Google, שבו הדף יוצא ונטען מחדש.
- המיון שנפתח בקהילה: "חדשות" (החלטה שלך). המיון שנבחר נשמר בזיכרון עד רענון.

### לפני הקומיט
- בדיקה ש-`.gitignore`, ‏`.env.example` ו-`.claude/settings.json` קיימים. ‏`.env.example` לא משתנה.
- `pass.txt` ו-`joke-app-spec.zip` לא נכנסים לריפו. מוסיפים קבצים בשמם.

### בדיקות (תנאי ההשלמה מ-milestones-5-6.md)
1. אורח רואה את הקהילה ואת המספרים. "אהבתי" פותח את חלון הכניסה, ואחרי הכניסה ההצבעה נשמרת.
2. "אהבתי" מסמן ומעלה ב-1. לחיצה שנייה מבטלת. מעבר ל"לא אהבתי" מחליף.
3. נועה ודניאל בשני חלונות: אחרי מעבר לשונית שניהם רואים 1 ו-1, וכל אחד את הסימון שלו בלבד.
4. ב-Console עם הטוקן של נועה: עשרים "אהבתי" לאותה בדיחה, ובקשה עם user_id של דניאל בגוף. ב-votes שורה אחת לנועה, ואין שורה חדשה לדניאל. ‏value של 5: ‏400. בלי טוקן: ‏401.
5. "הכי מצחיקות" ממוין לפי ההצבעות, עם מספר דירוג. "אהבתי" מראה רק את מה שהמחובר אהב.
6. בודק הנעילה מחזיר "נעול" על votes.
7. מחיקת חשבון של משתמש שהצביע: ההצבעות שלו נמחקות, והמספרים יורדים.
8. כפתור החזרה של הטלפון עובר בין הלשוניות.
9. ב-Network: אין אף בקשה ל-/rest/v1.
- בנוסף, אני בודק בעצמי: ‏feed?mode=liked בלי טוקן ‏401, ‏mode לא מוכר ‏400, ‏vote ל-uuid שלא קיים ‏404, ושהתשובה של feed בלי user_id.

## בנייה
- נוצר `db/create_votes.sql`, בדיוק לפי התכנון.
- ה-migration `create_votes` רץ ב-joke-app אחרי אישור, והצליח.
  - הנעילה: RLS דולק על votes, ואין אף policy. ל-service_role רק delete, ‏insert, ‏select ו-update. ל-anon ול-authenticated אין כלום על הטבלה, ואין להם execute על cast_vote ועל joke_feed. ל-service_role יש execute על שתיהן.
  - בדיקה כ-service_role, בתוך טרנזקציה שבוטלה (נשארו 0 הצבעות):
    - 21 "אהבתי" מאותו משתמש לאותה בדיחה: שורה אחת. התשובה 1, ‏0, ‏my_vote ‏1.
    - liked של המשתמש: 1. ‏top: ‏1. ‏liked לאורח (viewer null): ‏0.
    - מעבר ל"לא אהבתי": 0, ‏1, ‏1-. ביטול (0): ‏0, ‏0, ‏null.
    - value של 5: ‏22023. בדיחה שלא קיימת: ‏P0002. משתמש שלא קיים: ‏23503.
  - joke_feed לאורח: new מחזיר את 13 הבדיחות, ‏top ריק (אין עדיין הצבעות), ו-mode לא מוכר ריק.
  - get_advisors (security):
    - `rls_enabled_no_policy` ברמה INFO, על jokes ועל votes. זה בכוונה, ולא מוסיפים policy.
    - `auth_leaked_password_protection` ברמה WARN: הבדיקה מול HaveIBeenPwned כבויה. זו הגדרה של Auth, לא של הטבלה. היא זמינה רק בתוכנית בתשלום של Supabase, ולכן נשארת כמו שהיא.
  - get_advisors (performance): רק `unused_index` ברמה INFO, על jokes_user_id_idx. לא חדש, ונשאר.
- נוצרו `api/vote.js` ו-`api/feed.js`, לפי התכנון. נמחקו `api/laugh.js` ו-`api/top.js`.
  - vote: ‏value חייב להיות מסוג number (המחרוזת "1" נדחית). הבדיקה של הגוף רצה לפני הפנייה ל-Supabase.
  - feed: השדות בתשובה נבחרים אחד אחד, בלי user_id.
- `index.html`:
  - שלושה מסכים (`.view`) ולשוניות בתחתית, קישורים ל-‎#joke, ‏#community ו-#liked. ‏`hashchange` מחליף מסך, ו-# לא מוכר מוחלף ב-#joke עם replaceState.
  - `voteControls()` אחד לכל בדיחה: בלשונית בדיחה, בקהילה ובאהבתי. האייקונים SVG בתוך הדף.
  - אורח שלוחץ על הצבעה: ההצבעה נשמרת ב-`pendingVote`, וחלון הכניסה נפתח עם "כדי לדרג בדיחות צריך חשבון." החלון נסגר בלי כניסה: היא נמחקת.
  - כניסה או יציאה מזוהות לפי שינוי ב-id של המשתמש, ולא בכל רענון של הטוקן. אז נשלחת ההצבעה שחיכתה, ואחריה הרשימה הפתוחה נטענת מחדש.
  - רק התשובה של הבקשה האחרונה נכנסת למסך (`listTicket`), כדי שמעבר מהיר בין לשוניות לא יערבב רשימות.
  - נמחקו "צחקתי", ‏`loadTop` והעיצוב שלהם.
- `sw.js`: ‏`joke-v4`.
- נבדק:
  - אין שגיאות תחביר בפונקציות ובסקריפט של הדף. בדף וב-auth.js אין `innerHTML`, ‏`sb_publishable_`, ‏`sb_secret_` או `supabase.co`.
  - vote, בלי Supabase: ‏GET ‏405. בלי טוקן ‏401 עם auth_required. ‏value של 5 או "1", ו-id שאינו uuid: ‏400. תקין: ‏500 (אין Supabase), כצפוי.
  - feed, בלי Supabase: ‏POST ‏405. ‏mode לא מוכר או חסר: ‏400. ‏liked בלי טוקן: ‏401. ‏new: ‏500 (אין Supabase), כצפוי. בכל התשובות `no-store`.
  - בדפדפן, ברוחב 375, מול שרת דמה עם נתוני דוגמה: לשונית בדיחה עם רכיב ההצבעה וקישור לקהילה, קהילה בשני המיונים עם מספרי דירוג, אהבתי לאורח עם מסך נעול. הצבעה של אורח פותחת את חלון הכניסה עם ההסבר. כפתור החזרה חוזר ללשונית הקודמת. הסימון (aria-pressed) ברקע מנטה או ורוד ובאייקון מלא.
  - תוקן: שני כפתורי ההצבעה ירדו לשתי שורות ברוחב 375 (חסרו 3 פיקסלים). הריפוד והגופן הוקטנו מעט.
- עוד לא נבדק מול Supabase אמיתי: הצבעה של משתמש מחובר, ההצבעה שנשלחת אחרי כניסה, ורשימת אהבתי של מחובר. זה יקרה בשלב ההרצה.

## הרצה
- בחרת לבדוק ב-Vercel. לכן הקוד נדחף ל-main לפני הבדיקה שלך, בקומיט 6a86385.
- לפני הקומיט: `.gitignore`, ‏`.env.example` ו-`.claude/settings.json` קיימים, ו-`.env.example` לא השתנה. הקבצים נוספו בשמם, ו-`pass.txt` לא נכנס.
- נבדק מול האתר החי, https://joke-app-one-sigma.vercel.app:
  - ‏sw.js בגרסה joke-v4.
  - feed לאורח: ‏new מחזיר 200 עם 14 בדיחות. בכל אחת רק id, ‏topic, ‏text, ‏author_name, ‏likes, ‏dislikes, ‏my_vote ו-created_at, בלי user_id. ‏top מחזיר רשימה ריקה (אין עדיין הצבעות). ‏Cache-Control: no-store.
  - feed: ‏liked בלי טוקן ‏401, ‏mode לא מוכר ‏400, טוקן מזויף ‏401 עם auth_required.
  - vote: בלי טוקן ‏401, טוקן מזויף ‏401, ‏value של 5 ‏400.
  - ‏/api/laugh ו-/api/top: ‏404, כלומר נמחקו.
  - בקוד הדף אין sb_publishable_ ואין sb_secret_.
  - בדפדפן: לשונית הקהילה נטענת עם 14 כרטיסים, ‏Auth מוכן, אין אף בקשה ל-/rest/v1, ואין שגיאות ב-Console.
- עוד לבדיקה שלך: תנאים 1 עד 9, עם משתמשים אמיתיים (נועה ודניאל).
