// כל הכניסה בדפדפן. הספרייה של Supabase משמשת כאן רק ל-Auth:
// הרשמה, כניסה, התנתקות ושמירת הטוקן. אף טבלה לא נקראת מכאן.
// הכתובת והמפתח הציבורי מגיעים מ-/api/config, ולא כתובים בקוד.
(function () {
  const GENERIC = "משהו השתבש. נסו שוב.";
  const UNAVAILABLE = "הכניסה לא זמינה כרגע. בדיחות אפשר לבקש גם בלי.";

  const MESSAGES = {
    invalid_credentials: "המייל או הסיסמה לא נכונים.",
    user_already_exists: "המייל הזה כבר רשום. נסו להיכנס.",
    email_exists: "המייל הזה כבר רשום. נסו להיכנס.",
    weak_password: "הסיסמה קצרה מדי. צריך לפחות 6 תווים.",
    email_address_invalid: "המייל לא תקין.",
    validation_failed: "המייל לא תקין.",
    over_request_rate_limit: "יותר מדי ניסיונות. נסו שוב בעוד רגע.",
    over_email_send_rate_limit: "יותר מדי ניסיונות. נסו שוב בעוד רגע.",
    signup_disabled: "ההרשמה סגורה כרגע.",
    email_not_confirmed: "צריך לאשר את המייל לפני הכניסה.",
  };

  let client = null;
  let current = null;
  const listeners = new Set();

  function messageFor(error) {
    if (!error) return GENERIC;
    if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];
    if (/invalid login credentials/i.test(error.message || "")) return MESSAGES.invalid_credentials;
    if (/already registered/i.test(error.message || "")) return MESSAGES.user_already_exists;
    if (/password should be at least/i.test(error.message || "")) return MESSAGES.weak_password;
    return GENERIC;
  }

  function fail(message) {
    const error = new Error(message);
    error.userMessage = message;
    return error;
  }

  const ready = (async () => {
    try {
      if (!window.supabase?.createClient) throw new Error("supabase-js did not load");
      const response = await fetch("/api/config");
      const config = await response.json().catch(() => ({}));
      if (!response.ok || !config.url || !config.publishableKey) {
        throw new Error(config.code || `config status ${response.status}`);
      }
      client = window.supabase.createClient(config.url, config.publishableKey, {
        auth: {
          flowType: "pkce",
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      const { data } = await client.auth.getSession();
      current = data?.session ?? null;
      client.auth.onAuthStateChange((_event, session) => {
        current = session ?? null;
        for (const callback of listeners) {
          try { callback(current); } catch (error) { console.error(error); }
        }
      });
      return true;
    } catch (error) {
      console.error("auth unavailable:", error?.message || error);
      return false;
    }
  })();

  async function requireClient() {
    if (!(await ready) || !client) throw fail(UNAVAILABLE);
    return client;
  }

  window.Auth = {
    ready,

    async signUp(name, email, password) {
      const auth = (await requireClient()).auth;
      const { data, error } = await auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (error) throw fail(messageFor(error));
      // אם המייל כבר רשום ואישור המייל דולק, Supabase מחזיר משתמש בלי זהויות
      if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        throw fail(MESSAGES.user_already_exists);
      }
      if (!data?.session) throw fail(MESSAGES.email_not_confirmed);
      return data.session;
    },

    async signIn(email, password) {
      const auth = (await requireClient()).auth;
      const { data, error } = await auth.signInWithPassword({ email, password });
      if (error) throw fail(messageFor(error));
      return data.session;
    },

    // מקומי בלבד: מתנתק רק בדפדפן הזה
    async signOut() {
      if (!client) return;
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) console.error("signOut:", error.message);
      current = null;
    },

    session() {
      return current;
    },

    // getSession מחדש את הטוקן אם פג, למשל אחרי שהטלפון ישן
    async token() {
      if (!(await ready) || !client) return null;
      const { data } = await client.auth.getSession();
      current = data?.session ?? null;
      return current?.access_token ?? null;
    },

    onChange(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },

    messageFor,
  };
})();
