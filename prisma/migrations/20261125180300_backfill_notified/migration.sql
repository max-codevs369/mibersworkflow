-- Everything already live/past counts as already notified, so the reminder scheduler
-- doesn't re-send old announcements or remind about events that already happened.
UPDATE "Announcement" SET "notifiedAt" = NOW() WHERE "notifiedAt" IS NULL AND "status" = 'PUBLISHED' AND "publishedAt" <= NOW();
UPDATE "Event" SET "remindedAt" = NOW() WHERE "remindedAt" IS NULL AND "startAt" <= NOW() + INTERVAL '1 day';
