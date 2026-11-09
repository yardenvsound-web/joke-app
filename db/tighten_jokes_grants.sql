-- migration: tighten_jokes_grants
-- ל-service_role נשארות על public.jokes רק select, insert ו-update.
-- ההרשאות האחרות הגיעו מברירת המחדל של הפרויקט, ולא מ-create_jokes.

revoke delete, truncate, references, trigger on table public.jokes from service_role;
