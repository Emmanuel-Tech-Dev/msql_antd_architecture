// The sign-in page's look (setting login_ui), edited in Appearance › Sign-in
// page and served before sign-in by /auth/login_options. The server checks
// every value; this only fills gaps so the pages always have something to show.

export const LOGIN_LAYOUTS = [
  { value: 'split', label: 'Split', hint: 'Brand panel beside the form' },
  { value: 'centered', label: 'Centered', hint: 'One card, nothing else' },
  { value: 'cover', label: 'Cover', hint: 'Picture or brand colour beside the form' },
];

export const DEFAULT_LOGIN_UI = Object.freeze({
  layout: 'centered',
  headline: '',
  message: '',
  highlights: [],
  coverImage: '',
  helpUrl: '',
});

const DEFAULT_BRAND = Object.freeze({ name: 'Workspace', caption: '', mark: 'W' });
const text = (value) => (typeof value === 'string' ? value : '');

export function normalizeLoginUi(value) {
  const input = value && typeof value === 'object' ? value : {};
  return {
    layout: LOGIN_LAYOUTS.some((layout) => layout.value === input.layout) ? input.layout : DEFAULT_LOGIN_UI.layout,
    headline: text(input.headline),
    message: text(input.message),
    highlights: (Array.isArray(input.highlights) ? input.highlights : [])
      .filter((item) => text(item?.title).trim())
      .slice(0, 3)
      .map((item) => ({ title: item.title, detail: text(item.detail) })),
    coverImage: text(input.coverImage),
    helpUrl: text(input.helpUrl),
  };
}

// The page's settings plus the brand the sidebar uses.
export function normalizeLoginPage(page) {
  const brand = page?.brand ?? {};
  return {
    ...normalizeLoginUi(page),
    brand: {
      name: text(brand.name) || DEFAULT_BRAND.name,
      caption: text(brand.caption),
      mark: text(brand.mark) || DEFAULT_BRAND.mark,
    },
  };
}
