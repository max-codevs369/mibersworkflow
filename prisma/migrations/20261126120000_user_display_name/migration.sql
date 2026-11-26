ALTER TABLE "User" ADD COLUMN "displayName" TEXT NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION mibers_display_name(full_name TEXT, nick TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  WITH n AS (
    SELECT
      NULLIF(btrim(regexp_replace(COALESCE(nick, ''), '\s+', ' ', 'g')), '') AS nick,
      NULLIF(btrim(regexp_replace(COALESCE(full_name, ''), '\s+', ' ', 'g')), '') AS full_name
  )
  SELECT COALESCE(
    n.nick,
    (SELECT w FROM unnest(string_to_array(n.full_name, ' ')) WITH ORDINALITY AS t(w, i)
      WHERE w !~ '\.$' AND char_length(w) > 1 ORDER BY i LIMIT 1),
    split_part(n.full_name, ' ', 1),
    ''
  )
  FROM n
$$;

CREATE OR REPLACE FUNCTION mibers_user_display_name() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW."displayName" := mibers_display_name(
    NEW."name",
    (SELECT p."nickname" FROM "Profile" p WHERE p."userId" = NEW."id")
  );
  RETURN NEW;
END
$$;

CREATE TRIGGER user_display_name
BEFORE INSERT OR UPDATE OF "name", "displayName" ON "User"
FOR EACH ROW EXECUTE FUNCTION mibers_user_display_name();

CREATE OR REPLACE FUNCTION mibers_profile_display_name() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE "User" SET "displayName" = '' WHERE "id" = OLD."userId";
    RETURN OLD;
  END IF;
  UPDATE "User" SET "displayName" = '' WHERE "id" = NEW."userId";
  RETURN NEW;
END
$$;

CREATE TRIGGER profile_display_name
AFTER INSERT OR UPDATE OF "nickname" OR DELETE ON "Profile"
FOR EACH ROW EXECUTE FUNCTION mibers_profile_display_name();

UPDATE "User" SET "displayName" = '';

UPDATE "Note" n
SET "authorName" = u."displayName"
FROM "User" u
WHERE n."authorId" = u."id" AND n."isAnonymous" = false AND u."displayName" <> '';
