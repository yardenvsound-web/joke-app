# Milestone 3: התקנה בטלפון

## המטרה
מתקינים את האפליקציה במסך הבית, והיא נפתחת במסך מלא.

## תכנון

### הקבצים שמשתנים
| קובץ | מה משתנה |
|---|---|
| `manifest.webmanifest` | קובץ חדש |
| `sw.js` | קובץ חדש |
| `index.html` | קישור ל-manifest, ‏`theme-color`, אייקון לאייפון, ורישום של sw.js |

`api/joke.js` לא משתנה. האייקונים כבר בתיקיית assets, בגדלים הנכונים (192, ‏512, ‏512 maskable). משתמשים בהם כמו שהם.

### manifest.webmanifest
- `name: "בדיחה בלחיצה"`, ‏`short_name: "בדיחה"` (קצר, כדי שייכנס מתחת לאייקון).
- `start_url: "/"`, ‏`scope: "/"`, ‏`display: "standalone"`.
- `lang: "he"`, ‏`dir: "rtl"`.
- `theme_color` ו-`background_color`: שניהם `#FFE15A`.
- `description`: אותו משפט כמו ב-`<meta name="description">`.
- אייקונים:
  - `assets/icon-192.png`, ‏192x192, ‏`purpose: any`
  - `assets/icon-512.png`, ‏512x512, ‏`purpose: any`
  - `assets/icon-512-maskable.png`, ‏512x512, ‏`purpose: maskable`

### sw.js (לפי סעיף 7 ב-ARCHITECTURE.md)
- שם מטמון אחד, למשל `joke-v1`.
- `install`: שומר במטמון את `/`, את ה-manifest, את קבצי ה-SVG מ-assets ואת שני האייקונים (192 ו-512), ואז `skipWaiting`.
- `activate`: מוחק מטמונים בשם אחר, ואז `clients.claim`.
- `fetch`:
  - לא נוגע בבקשה שאינה GET, בבקשה לכתובת אחרת (כמו הגופנים של Google), ובכל בקשה שמתחילה ב-`/api`.
  - כל השאר: קודם רשת, ושומר עותק במטמון. אין רשת: מחזיר מהמטמון.
- בגלל network-first, כל push מופיע אחרי רענון רגיל. אין צורך להחליף את שם המטמון בכל שינוי.

### index.html
- `<link rel="manifest" href="/manifest.webmanifest">`
- `<meta name="theme-color" content="#FFE15A">`
- `<link rel="apple-touch-icon" href="assets/icon-192.png">`, כי אייפון לא לוקח את האייקון מה-manifest. ה-`icon.svg` הקיים נשאר.
- בסוף הסקריפט: רישום של `/sw.js`, רק אם הדפדפן תומך (`"serviceWorker" in navigator`).

### Vercel
- אין `vercel.json`. Vercel מגיש קבצים סטטיים עם `max-age=0, must-revalidate`, ולכן גם `sw.js` מתעדכן לבד.
- אין צורך ב-Redeploy. push מספיק.

### בדיקות (תנאי ההשלמה)
1. במחשב, בכלי המפתחים, Application ואז Manifest: אין שגיאות, ושני האייקונים מופיעים.
2. בטלפון: "התקנת אפליקציה" או "הוספה למסך הבית" מופיע, והאפליקציה נפתחת בלי שורת כתובת.
3. בתוך האפליקציה המותקנת מגיעה בדיחה חדשה בכל לחיצה.
4. ב-Application ואז Cache Storage אין אף כתובת של /api.
5. שינוי קטן בטקסט, push, ורענון: השינוי מופיע.

## בנייה
- נוצרו `manifest.webmanifest` ו-`sw.js` לפי התכנון.
- ב-`index.html`: נוספו `theme-color`, ‏`manifest`, ‏`apple-touch-icon` ורישום של `/sw.js`.
- נבדק: ה-manifest הוא JSON תקין, ל-`sw.js` אין שגיאות תחביר, וכל הקבצים ברשימת ה-precache קיימים.
- עוד לא נבדק בדפדפן ובטלפון. זה השלב הבא (הרצה).
