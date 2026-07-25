START TRANSACTION;

UPDATE `ui_settings`
SET
  `setting_value` = JSON_SET(
    `setting_value`,
    '$.colors.info',
    COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`setting_value`, '$.colors.info')), '#4776b8'),
    '$.darkColors',
    COALESCE(
      JSON_EXTRACT(`setting_value`, '$.darkColors'),
      JSON_OBJECT(
        'siderBg', '#0d110f',
        'headerBg', '#171c1a',
        'contentBg', '#111513',
        'accent', '#55b8ae',
        'accentText', '#10201d',
        'textPrimary', '#e4e9e6',
        'textMuted', '#a7b0ac',
        'border', '#303936',
        'itemHover', '#232a27',
        'itemActive', '#173532',
        'surfaceBg', '#171c1a',
        'elevatedBg', '#1c2220',
        'bodyText', '#e4e9e6',
        'secondaryText', '#a7b0ac',
        'strongBorder', '#303936',
        'success', '#6cba88',
        'warning', '#d7a552',
        'error', '#e37a82',
        'info', '#79a4db'
      )
    )
  ),
  `version` = `version` + 1
WHERE `setting_key` = 'layout.sider'
  AND (
    JSON_EXTRACT(`setting_value`, '$.darkColors') IS NULL
    OR JSON_EXTRACT(`setting_value`, '$.colors.info') IS NULL
  );

COMMIT;
