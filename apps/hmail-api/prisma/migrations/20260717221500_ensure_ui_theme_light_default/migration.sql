-- Ensure light (white) remains the default shell theme for new and existing users.
ALTER TABLE "User" ALTER COLUMN "uiThemeVersion" SET DEFAULT 'light';
UPDATE "User" SET "uiThemeVersion" = 'light' WHERE "uiThemeVersion" = 'dark';
