ALTER TABLE "companies"
  ADD COLUMN "login_image_path" VARCHAR(255),
  ADD COLUMN "sidebar_image_path" VARCHAR(255),
  ADD COLUMN "browser_icon_path" VARCHAR(255);

UPDATE "companies"
SET
  "login_image_path" = COALESCE("login_image_path", "logo_path"),
  "sidebar_image_path" = COALESCE("sidebar_image_path", "logo_path"),
  "browser_icon_path" = COALESCE("browser_icon_path", "icon_path");

ALTER TABLE "companies"
  ALTER COLUMN "login_image_path" SET NOT NULL,
  ALTER COLUMN "sidebar_image_path" SET NOT NULL,
  ALTER COLUMN "browser_icon_path" SET NOT NULL;

ALTER TABLE "companies"
  DROP COLUMN "logo_path",
  DROP COLUMN "icon_path";
