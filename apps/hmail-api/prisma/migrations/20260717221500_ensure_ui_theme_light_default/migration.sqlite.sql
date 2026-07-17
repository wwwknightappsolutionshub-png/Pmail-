-- Ensure light (white) remains the default shell theme for new and existing users.
UPDATE "User" SET "uiThemeVersion" = 'light' WHERE "uiThemeVersion" = 'dark';
