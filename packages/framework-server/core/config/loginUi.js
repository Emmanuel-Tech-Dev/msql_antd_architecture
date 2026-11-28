// The sign-in page's look (ui_settings row "login_ui"), edited in
// Appearance › Sign-in page. It is shown before sign-in, so it holds display
// text only and is served by the public /auth/login_options.
const { z } = require("zod");

const DEFAULT_LOGIN_UI = Object.freeze({
  layout: "centered",
  headline: "",
  message: "",
  highlights: [],
  coverImage: "",
  helpUrl: "",
});

const webAddress = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value === "" || /^https?:\/\/\S+$/i.test(value), "Must start with http:// or https://");

const loginUiSchema = z
  .object({
    layout: z.enum(["split", "centered", "cover"]),
    headline: z.string().trim().max(120),
    message: z.string().trim().max(280),
    highlights: z
      .array(z.object({ title: z.string().trim().min(1).max(40), detail: z.string().trim().max(80) }).strict())
      .max(3),
    coverImage: webAddress,
    helpUrl: webAddress,
  })
  .strict();

// A stored value that no longer passes (edited by hand, older shape) falls
// back to the defaults instead of breaking the sign-in page.
function readLoginUi(value) {
  const parsed = loginUiSchema.safeParse({ ...DEFAULT_LOGIN_UI, ...(value ?? {}) });
  return parsed.success ? parsed.data : { ...DEFAULT_LOGIN_UI };
}

module.exports = { DEFAULT_LOGIN_UI, loginUiSchema, readLoginUi };
